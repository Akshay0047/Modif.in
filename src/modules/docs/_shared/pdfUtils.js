import * as pdfjs from "pdfjs-dist";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).href;

export async function loadPdfWithPdfLib(arrayBuffer, options = {}) {
    return PDFDocument.load(arrayBuffer, { ignoreEncryption: true, ...options });
}

export async function loadPdfWithPdfJs(arrayBuffer) {
    const data = arrayBuffer instanceof Uint8Array
        ? arrayBuffer
        : new Uint8Array(arrayBuffer);
    const loadingTask = pdfjs.getDocument({ data });
    return loadingTask.promise;
}

export async function getPdfPageCount(arrayBuffer) {
    const pdf = await loadPdfWithPdfJs(arrayBuffer);
    const count = pdf.numPages;
    pdf.destroy();
    return count;
}

export async function renderPageToCanvas(pdf, pageNumber, scale = 1.5) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    page.cleanup();
    return canvas;
}

export async function renderPageToDataUrl(pdf, pageNumber, scale = 1.5, mimeType = "image/png") {
    const canvas = await renderPageToCanvas(pdf, pageNumber, scale);
    const dataUrl = canvas.toDataURL(mimeType);
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
}

export async function extractPageText(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    page.cleanup();
    const items = content.items.map((item) => item.str);
    return items.join(" ");
}

export async function extractAllText(pdf) {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
        pages.push(await extractPageText(pdf, i));
    }
    return pages.join("\n\n");
}

export async function mergePdfBuffers(buffers) {
    const merged = await PDFDocument.create();
    for (const buffer of buffers) {
        const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const indices = source.getPageIndices();
        const pages = await merged.copyPages(source, indices);
        pages.forEach((page) => merged.addPage(page));
    }
    return merged.save();
}

export async function extractPages(buffer, pageIndices) {
    const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, pageIndices);
    pages.forEach((page) => output.addPage(page));
    return output.save();
}

export async function reorderPages(buffer, order, rotations = {}) {
    const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const output = await PDFDocument.create();
    const allPages = await output.copyPages(source, source.getPageIndices());

    for (const index of order) {
        const page = allPages[index];
        const rotation = rotations[index] ?? 0;
        if (rotation) {
            page.setRotation(degrees(rotation));
        }
        output.addPage(page);
    }

    return output.save();
}

export async function embedImageInPdf(imageBytes, mimeType) {
    const pdf = await PDFDocument.create();
    const image = mimeType.includes("png")
        ? await pdf.embedPng(imageBytes)
        : await pdf.embedJpg(imageBytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return pdf.save();
}

export async function addWatermark(buffer, options) {
    const {
        text = "CONFIDENTIAL",
        opacity = 0.3,
        fontSize = 48,
        angle = -45,
        color = rgb(0.5, 0.5, 0.5),
        tile = false,
    } = options;

    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pages = pdf.getPages();

    for (const page of pages) {
        const { width, height } = page.getSize();
        if (tile) {
            for (let y = 0; y < height; y += fontSize * 3) {
                for (let x = 0; x < width; x += text.length * fontSize * 0.6) {
                    page.drawText(text, {
                        x,
                        y,
                        size: fontSize,
                        font,
                        color,
                        opacity,
                        rotate: degrees(angle),
                    });
                }
            }
        } else {
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            page.drawText(text, {
                x: (width - textWidth) / 2,
                y: height / 2,
                size: fontSize,
                font,
                color,
                opacity,
                rotate: degrees(angle),
            });
        }
    }

    return pdf.save();
}

export async function stripMetadata(buffer) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("");
    pdf.setCreator("");
    pdf.setCreationDate(new Date(0));
    pdf.setModificationDate(new Date(0));
    return pdf.save();
}

export async function flattenPdf(buffer) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = pdf.getForm();
    try {
        form.flatten();
    } catch {
        // No form fields to flatten
    }
    return pdf.save();
}

export async function addPageNumbers(buffer, options = {}) {
    const {
        format = "Page {n} of {total}",
        fontSize = 10,
        margin = 30,
    } = options;

    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();
    const total = pages.length;

    pages.forEach((page, index) => {
        const { width } = page.getSize();
        const label = format
            .replace("{n}", String(index + 1))
            .replace("{total}", String(total));
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        page.drawText(label, {
            x: (width - textWidth) / 2,
            y: margin,
            size: fontSize,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
    });

    return pdf.save();
}

export async function repairPdf(buffer) {
    try {
        const pdf = await PDFDocument.load(buffer, {
            ignoreEncryption: true,
            throwOnInvalidObject: false,
        });
        return pdf.save();
    } catch {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage();
        page.drawText("Document could not be fully recovered.", {
            x: 50,
            y: page.getHeight() - 50,
            size: 12,
        });
        return pdf.save();
    }
}

export { PDFDocument, degrees, rgb, StandardFonts, pdfjs };
