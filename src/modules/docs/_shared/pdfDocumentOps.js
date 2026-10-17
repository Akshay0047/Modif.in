import { PDFName, rgb, StandardFonts } from "pdf-lib";

export function formatPdfKeywords(keywords) {
    if (Array.isArray(keywords)) {
        const text = keywords.map((item) => String(item).trim()).filter(Boolean).join(", ");
        return text || "(empty)";
    }
    if (typeof keywords === "string") return keywords.trim() || "(empty)";
    return "(empty)";
}

export function combinePageRotation(existing, extra) {
    const base = Number(existing) || 0;
    const add = Number(extra) || 0;
    return ((base + add) % 360 + 360) % 360;
}

function deleteKey(dict, name) {
    if (!dict?.delete) return;
    dict.delete(PDFName.of(name));
}

function lookup(pdf, value) {
    if (!value) return undefined;
    try {
        return pdf.context.lookup(value);
    } catch {
        return value;
    }
}

function numberAt(array, index) {
    const value = array.lookup(index);
    if (typeof value?.asNumber === "function") return value.asNumber();
    const raw = Number(value);
    return Number.isFinite(raw) ? raw : 0;
}

function blankObject(pdf, value) {
    const object = lookup(pdf, value);
    if (!object) return;
    if (object.contents instanceof Uint8Array) {
        object.contents = new Uint8Array();
    }
    if (typeof object.value === "string") {
        object.value = "";
    }
}

export function stripDocumentMetadata(pdf) {
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("");
    pdf.setCreator("");
    pdf.setCreationDate(new Date(0));
    pdf.setModificationDate(new Date(0));
    blankObject(pdf, pdf.catalog.get(PDFName.of("Metadata")));
    deleteKey(pdf.catalog, "Metadata");
    deleteKey(pdf.catalog, "PieceInfo");
}

export function removeActivePdfContent(pdf) {
    deleteKey(pdf.catalog, "OpenAction");
    deleteKey(pdf.catalog, "AA");
    const names = lookup(pdf, pdf.catalog.get(PDFName.of("Names")));
    if (names?.get) {
        blankObject(pdf, names.get(PDFName.of("JavaScript")));
        deleteKey(names, "JavaScript");
    }

    for (const page of pdf.getPages()) {
        deleteKey(page.node, "AA");
        const annots = lookup(pdf, page.node.get(PDFName.of("Annots")));
        if (!annots?.size) continue;
        for (let index = 0; index < annots.size(); index += 1) {
            const annot = lookup(pdf, annots.get(index));
            deleteKey(annot, "A");
            deleteKey(annot, "AA");
        }
    }
}

export function bakeAndRemoveAnnotations(pdf) {
    for (const page of pdf.getPages()) {
        const annots = lookup(pdf, page.node.get(PDFName.of("Annots")));
        if (annots?.size) {
            for (let index = 0; index < annots.size(); index += 1) {
                const annot = lookup(pdf, annots.get(index));
                const rect = lookup(pdf, annot?.get?.(PDFName.of("Rect")));
                if (!rect || rect.size() < 4) continue;
                const x1 = numberAt(rect, 0);
                const y1 = numberAt(rect, 1);
                const x2 = numberAt(rect, 2);
                const y2 = numberAt(rect, 3);
                const x = Math.min(x1, x2);
                const y = Math.min(y1, y2);
                const width = Math.abs(x2 - x1);
                const height = Math.abs(y2 - y1);
                if (width > 0 && height > 0) {
                    page.drawRectangle({
                        x,
                        y,
                        width,
                        height,
                        borderWidth: 1,
                        borderColor: rgb(0.2, 0.2, 0.2),
                        opacity: 0,
                        borderOpacity: 1,
                    });
                }
                const contents = lookup(pdf, annot.get(PDFName.of("Contents")));
                const text = contents?.decodeText?.() ?? "";
                if (text) {
                    try {
                        page.drawText(text.replace(/\s+/g, " ").slice(0, 240), {
                            x: x + 2,
                            y: Math.max(y + 2, 2),
                            size: 9,
                            color: rgb(0, 0, 0),
                        });
                    } catch {
                        // Annotation text can use characters the standard font cannot draw.
                    }
                }
            }
        }
        deleteKey(page.node, "Annots");
    }
}

export async function flattenDocument(pdf) {
    try {
        const form = pdf.getForm();
        if (form.getFields().length > 0) {
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            form.updateFieldAppearances(font);
            form.flatten();
        }
    } catch {
        // The file has no form to flatten.
    }
    bakeAndRemoveAnnotations(pdf);
}

export async function prepareArchivalDocument(pdf) {
    await flattenDocument(pdf);
    removeActivePdfContent(pdf);
    stripDocumentMetadata(pdf);
}
