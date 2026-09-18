import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).href;

function postProgress(progress, status) {
    self.postMessage({ type: "progress", progress, status });
}

async function mergePdfs(payload) {
    const { buffers } = payload;
    const merged = await PDFDocument.create();

    for (let index = 0; index < buffers.length; index += 1) {
        postProgress((index / buffers.length) * 90, `Merging file ${index + 1} of ${buffers.length}`);
        const source = await PDFDocument.load(buffers[index], { ignoreEncryption: true });
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
    }

    postProgress(95, "Finalizing merged PDF");
    const bytes = await merged.save();
    postProgress(100, "Done");
    return bytes;
}

async function compressPdf(payload) {
    const { buffer, quality, scale } = payload;
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const output = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        postProgress(((pageNum - 1) / pdf.numPages) * 90, `Compressing page ${pageNum}`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
        const imageBytes = new Uint8Array(await blob.arrayBuffer());
        const image = await output.embedJpg(imageBytes);
        const pdfPage = output.addPage([viewport.width, viewport.height]);
        pdfPage.drawImage(image, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
        });
        canvas.width = 0;
        canvas.height = 0;
    }

    postProgress(95, "Saving compressed PDF");
    const bytes = await output.save();
    postProgress(100, "Done");
    return bytes;
}

async function runOcr(payload) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
        logger: (message) => {
            if (message.status === "recognizing text" && message.progress) {
                postProgress(message.progress * 100, "Recognizing text");
            }
        },
    });

    try {
        const { imageData, width, height } = payload;
        const result = await worker.recognize(imageData, { rectangle: { left: 0, top: 0, width, height } });
        postProgress(100, "Done");
        return {
            text: result.data.text,
            words: result.data.words ?? [],
        };
    } finally {
        await worker.terminate();
    }
}

self.addEventListener("message", async (event) => {
    const { type, payload } = event.data;
    try {
        let result;
        if (type === "merge-pdfs") result = await mergePdfs(payload);
        else if (type === "compress-pdf") result = await compressPdf(payload);
        else if (type === "ocr") result = await runOcr(payload);
        else throw new Error(`Unknown worker task: ${type}`);

        const transferables =
            result instanceof Uint8Array ? [result.buffer] : [];
        self.postMessage({ type: "result", result }, transferables);
    } catch (error) {
        self.postMessage({
            type: "error",
            error: error instanceof Error ? error.message : "Worker task failed.",
        });
    }
});
