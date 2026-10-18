import {
    PDFArray,
    PDFDict,
    PDFName,
    PDFStream,
    concatTransformationMatrix,
    drawObject,
    popGraphicsState,
    pushGraphicsState,
} from "pdf-lib";

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
    return Number.isFinite(raw) ? raw : NaN;
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
    const appearances = [];
    for (const page of pdf.getPages()) {
        const annots = lookup(pdf, page.node.get(PDFName.of("Annots")));
        if (annots instanceof PDFArray) {
            for (let index = 0; index < annots.size(); index += 1) {
                const annot = lookup(pdf, annots.get(index));
                // pdf-lib can leave references to widgets it has already flattened and deleted.
                if (!annot) continue;
                if (!(annot instanceof PDFDict)) {
                    throw new Error("An annotation could not be flattened safely. The original PDF has been preserved.");
                }
                const flags = lookup(pdf, annot.get(PDFName.of("F")))?.asNumber?.() ?? 0;
                if (flags & (2 | 32)) continue; // Hidden or not visible on the page.
                if (annot.get(PDFName.of("Subtype")) === PDFName.of("Popup")) continue;
                const rect = lookup(pdf, annot?.get?.(PDFName.of("Rect")));
                if (!(rect instanceof PDFArray) || rect.size() < 4) {
                    throw new Error("An annotation has an invalid rectangle and could not be flattened safely.");
                }
                const x1 = numberAt(rect, 0);
                const y1 = numberAt(rect, 1);
                const x2 = numberAt(rect, 2);
                const y2 = numberAt(rect, 3);
                const x = Math.min(x1, x2);
                const y = Math.min(y1, y2);
                const width = Math.abs(x2 - x1);
                const height = Math.abs(y2 - y1);
                if (width === 0 || height === 0) continue;

                const ap = lookup(pdf, annot.get(PDFName.of("AP")));
                let appearance = lookup(pdf, ap?.get?.(PDFName.of("N")));
                if (appearance instanceof PDFDict) {
                    appearance = lookup(pdf, appearance.get(annot.get(PDFName.of("AS"))));
                }
                const bbox = lookup(pdf, appearance?.dict?.get(PDFName.of("BBox")));
                if (!(appearance instanceof PDFStream) || !(bbox instanceof PDFArray) || bbox.size() < 4) {
                    throw new Error("An annotation has no usable appearance. Flattening was stopped to preserve the original PDF.");
                }
                const matrix = lookup(pdf, appearance.dict.get(PDFName.of("Matrix")));
                const [a, b, c, d, e, f] = matrix instanceof PDFArray
                    ? Array.from({ length: 6 }, (_, i) => numberAt(matrix, i))
                    : [1, 0, 0, 1, 0, 0];
                const [left, bottom, right, top] = Array.from({ length: 4 }, (_, i) => numberAt(bbox, i));
                const corners = [[left, bottom], [left, top], [right, bottom], [right, top]];
                const xs = corners.map(([px, py]) => a * px + c * py + e);
                const ys = corners.map(([px, py]) => b * px + d * py + f);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                const scaleX = width / (Math.max(...xs) - minX);
                const scaleY = height / (Math.max(...ys) - minY);
                const transform = [scaleX, 0, 0, scaleY, x - scaleX * minX, y - scaleY * minY];
                if (!transform.every(Number.isFinite)) {
                    throw new Error("An annotation has an invalid appearance transform and could not be flattened safely.");
                }
                appearances.push({ page, appearance, transform });
            }
        }
    }

    // Reuse the original appearance streams, including their fonts and graphics.
    // Validate every annotation before removing any from the document.
    for (const { page, appearance, transform } of appearances) {
        const key = page.node.newXObject("FlatAnnotation", pdf.context.register(appearance));
        page.pushOperators(
            pushGraphicsState(),
            concatTransformationMatrix(...transform),
            drawObject(key),
            popGraphicsState(),
        );
    }
    for (const page of pdf.getPages()) {
        deleteKey(page.node, "Annots");
    }
}

export async function flattenDocument(pdf) {
    const form = pdf.getForm();
    if (form.getFields().length > 0) form.flatten();
    bakeAndRemoveAnnotations(pdf);
}

export async function prepareArchivalDocument(pdf) {
    await flattenDocument(pdf);
    removeActivePdfContent(pdf);
    stripDocumentMetadata(pdf);
}
