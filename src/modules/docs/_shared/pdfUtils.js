import * as pdfjs from "pdfjs-dist";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

let pdfJsInitialized = false;

export function initPdfJs() {
    if (!pdfJsInitialized) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
        ).href;
        pdfJsInitialized = true;
    }
}

export async function loadPdfJsDocument(arrayBuffer) {
    initPdfJs();
    const data = arrayBuffer instanceof Uint8Array
        ? arrayBuffer
        : new Uint8Array(arrayBuffer);
    return pdfjs.getDocument({ data }).promise;
}

export async function loadPdfLibDocument(arrayBuffer, options = {}) {
    return PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        ...options,
    });
}

export async function renderPageToCanvas(pdfDoc, pageNum, canvas, scale = 1.25) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    return { page, viewport };
}

export async function renderPageToImageData(pdfDoc, pageNum, scale = 2) {
    const canvas = document.createElement("canvas");
    const { viewport } = await renderPageToCanvas(pdfDoc, pageNum, canvas, scale);
    const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    return { imageData, width: viewport.width, height: viewport.height };
}

export async function extractTextFromPdf(arrayBuffer) {
    const pdf = await loadPdfJsDocument(arrayBuffer);
    const pages = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const items = content.items.map((item) => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
        }));
        const text = items.map((item) => item.text).join(" ");
        pages.push({ pageNum, text, items });
    }
    return { numPages: pdf.numPages, pages };
}

export function parsePageRange(rangeStr, totalPages) {
    const trimmed = rangeStr.trim();
    if (!trimmed) return [];

    const indices = new Set();
    const parts = trimmed.split(",");

    for (const part of parts) {
        const segment = part.trim();
        if (!segment) continue;

        if (segment.includes("-")) {
            const [startRaw, endRaw] = segment.split("-");
            const start = Number.parseInt(startRaw, 10);
            const end = Number.parseInt(endRaw, 10);
            if (!Number.isFinite(start) || !Number.isFinite(end)) {
                throw new Error(`Invalid page range segment: ${segment}`);
            }
            const from = Math.min(start, end);
            const to = Math.max(start, end);
            for (let page = from; page <= to; page += 1) {
                if (page >= 1 && page <= totalPages) indices.add(page - 1);
            }
        } else {
            const page = Number.parseInt(segment, 10);
            if (!Number.isFinite(page)) {
                throw new Error(`Invalid page number: ${segment}`);
            }
            if (page >= 1 && page <= totalPages) indices.add(page - 1);
        }
    }

    return Array.from(indices).sort((a, b) => a - b);
}

export async function copyPagesToNewPdf(sourcePdf, pageIndices) {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(sourcePdf, pageIndices);
    copied.forEach((page) => output.addPage(page));
    return output;
}

export async function embedCanvasPage(pdfDoc, canvas, pageWidth, pageHeight) {
    const pngData = canvas.toDataURL("image/png");
    const image = await pdfDoc.embedPng(pngData);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
    });
    return page;
}

export async function drawWatermark(page, pdfDoc, text, options = {}) {
    const {
        fontSize = 48,
        opacity = 0.2,
        angle = -45,
        color = rgb(0.5, 0.5, 0.5),
        tile = false,
    } = options;
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    if (tile) {
        for (let y = 0; y < height; y += fontSize * 3) {
            for (let x = -width; x < width * 2; x += textWidth + 40) {
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
        return;
    }

    page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: degrees(angle),
    });
}

export { PDFDocument, degrees, rgb, StandardFonts };
