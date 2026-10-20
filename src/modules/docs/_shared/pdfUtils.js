import { clonePdfBytes } from "./pdfBytes";
import * as pdfjs from "pdfjs-dist";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import {
    combinePageRotation,
    flattenDocument,
    prepareArchivalDocument,
    stripDocumentMetadata,
} from "./pdfDocumentOps";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).href;

export async function loadPdfWithPdfLib(arrayBuffer, options = {}) {
    return PDFDocument.load(clonePdfBytes(arrayBuffer), {
        ignoreEncryption: true,
        ...options,
    });
}

export async function loadPdfWithPdfJs(arrayBuffer) {
    const data = clonePdfBytes(arrayBuffer);
    const loadingTask = pdfjs.getDocument({
        data,
        isEvalSupported: false,
        useSystemFonts: true,
    });
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
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;
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
        const source = await PDFDocument.load(clonePdfBytes(buffer), {
            ignoreEncryption: true,
        });
        const indices = source.getPageIndices();
        const pages = await merged.copyPages(source, indices);
        pages.forEach((page) => merged.addPage(page));
    }
    return merged.save();
}

export async function compressPdf(buffer, options = {}) {
    const { quality = 0.6, scale = 1.2, onProgress } = options;
    const pdf = await loadPdfWithPdfJs(buffer);
    const output = await PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i += 1) {
        const canvas = await renderPageToCanvas(pdf, i, scale);
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (next) => (next ? resolve(next) : reject(new Error("Failed to encode page."))),
                "image/jpeg",
                quality,
            );
        });
        const imageBytes = new Uint8Array(await blob.arrayBuffer());
        const image = await output.embedJpg(imageBytes);
        const pdfPage = output.addPage([canvas.width, canvas.height]);
        pdfPage.drawImage(image, {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
        });
        canvas.width = 0;
        canvas.height = 0;
        onProgress?.((i / pdf.numPages) * 100);
    }

    pdf.destroy();
    return output.save();
}

export async function extractPages(buffer, pageIndices) {
    const source = await loadPdfWithPdfLib(buffer);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, pageIndices);
    pages.forEach((page) => output.addPage(page));
    return output.save();
}

export async function reorderPages(buffer, order, rotations = {}) {
    const source = await loadPdfWithPdfLib(buffer);
    const output = await PDFDocument.create();
    const allPages = await output.copyPages(source, source.getPageIndices());

    for (const index of order) {
        const page = allPages[index];
        const extra = rotations[index] ?? 0;
        if (extra) {
            page.setRotation(degrees(combinePageRotation(page.getRotation().angle, extra)));
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

    const pdf = await loadPdfWithPdfLib(buffer);
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
    const pdf = await loadPdfWithPdfLib(buffer);
    stripDocumentMetadata(pdf);
    return pdf.save();
}

export async function flattenPdf(buffer) {
    const pdf = await loadPdfWithPdfLib(buffer);
    await flattenDocument(pdf);
    return pdf.save();
}

export async function toArchivalPdf(buffer) {
    const pdf = await loadPdfWithPdfLib(buffer);
    await prepareArchivalDocument(pdf);
    return pdf.save();
}

export async function addPageNumbers(buffer, options = {}) {
    const {
        format = "Page {n} of {total}",
        fontSize = 10,
        margin = 30,
    } = options;

    const pdf = await loadPdfWithPdfLib(buffer);
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
        const pdf = await loadPdfWithPdfLib(buffer, {
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

export async function extractPdfPageImages(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const ops = await page.getOperatorList();
    const images = [];
    const seen = new Set();

    for (let i = 0; i < ops.fnArray.length; i += 1) {
        const fn = ops.fnArray[i];
        if (
            fn !== pdfjs.OPS.paintImageXObject &&
            fn !== pdfjs.OPS.paintInlineImageXObject &&
            fn !== pdfjs.OPS.paintJpegXObject
        ) {
            continue;
        }

        const name = ops.argsArray[i]?.[0];
        if (typeof name !== "string" || seen.has(name)) continue;
        seen.add(name);

        const img = await new Promise((resolve) => {
            try {
                page.objs.get(name, (value) => resolve(value));
            } catch {
                resolve(null);
            }
        });
        if (!img) continue;

        const canvas = document.createElement("canvas");
        canvas.width = img.width || 1;
        canvas.height = img.height || 1;
        const ctx = canvas.getContext("2d");
        if (img.bitmap) {
            ctx.drawImage(img.bitmap, 0, 0);
        } else if (img.data) {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const src = img.data;
            const kind = img.kind;
            if (kind === 3 || src.length === canvas.width * canvas.height * 4) {
                imageData.data.set(src);
            } else if (kind === 2 || src.length === canvas.width * canvas.height * 3) {
                let di = 0;
                for (let si = 0; si < src.length; si += 3) {
                    imageData.data[di++] = src[si];
                    imageData.data[di++] = src[si + 1];
                    imageData.data[di++] = src[si + 2];
                    imageData.data[di++] = 255;
                }
            } else {
                for (let si = 0; si < src.length; si += 1) {
                    const value = src[si];
                    imageData.data[si * 4] = value;
                    imageData.data[si * 4 + 1] = value;
                    imageData.data[si * 4 + 2] = value;
                    imageData.data[si * 4 + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        } else {
            continue;
        }

        images.push({
            id: name,
            dataUrl: canvas.toDataURL("image/png"),
            width: canvas.width,
            height: canvas.height,
        });
    }

    page.cleanup();
    return images;
}

export { clonePdfBytes, PDFDocument, degrees, rgb, StandardFonts, pdfjs };
