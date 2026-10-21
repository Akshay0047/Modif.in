import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import { getOcrWorkerOptions } from "../ocrConfig";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).href;

function cloneBytes(input) {
    if (input instanceof Uint8Array) {
        return Uint8Array.from(input);
    }
    if (input instanceof ArrayBuffer) {
        return new Uint8Array(input.slice(0));
    }
    return Uint8Array.from(input ?? []);
}

function reply(requestId, message) {
    self.postMessage({ requestId, ...message });
}

self.addEventListener("message", async (event) => {
    const { task, payload, requestId } = event.data ?? {};

    try {
        if (task === "merge") {
            const merged = await PDFDocument.create();
            const total = payload.buffers.length;
            for (let i = 0; i < total; i += 1) {
                const source = await PDFDocument.load(cloneBytes(payload.buffers[i]), {
                    ignoreEncryption: true,
                });
                const pages = await merged.copyPages(source, source.getPageIndices());
                pages.forEach((page) => merged.addPage(page));
                reply(requestId, { type: "progress", progress: ((i + 1) / total) * 100 });
            }
            const result = await merged.save();
            reply(requestId, { type: "done", result });
            return;
        }

        if (task === "compress") {
            if (typeof OffscreenCanvas !== "function") {
                throw new Error("OffscreenCanvas is not available in this browser.");
            }

            const data = cloneBytes(payload.buffer);
            const pdf = await pdfjs.getDocument({
                data,
                disableFontFace: true,
                isEvalSupported: false,
                useSystemFonts: false,
            }).promise;
            const output = await PDFDocument.create();
            const quality = payload.quality ?? 0.6;
            const scale = payload.scale ?? 1.2;

            for (let i = 1; i <= pdf.numPages; i += 1) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });
                const canvas = new OffscreenCanvas(
                    Math.ceil(viewport.width),
                    Math.ceil(viewport.height),
                );
                const ctx = canvas.getContext("2d");
                await page.render({
                    canvasContext: ctx,
                    viewport,
                    canvas,
                }).promise;
                page.cleanup();

                const blob = await canvas.convertToBlob({
                    type: "image/jpeg",
                    quality,
                });
                const imageBytes = new Uint8Array(await blob.arrayBuffer());
                const image = await output.embedJpg(imageBytes);
                const pdfPage = output.addPage([viewport.width, viewport.height]);
                pdfPage.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: viewport.width,
                    height: viewport.height,
                });

                reply(requestId, {
                    type: "progress",
                    progress: (i / pdf.numPages) * 100,
                });
            }

            pdf.destroy();
            const result = await output.save();
            reply(requestId, { type: "done", result });
            return;
        }

        if (task === "ocr") {
            if (payload.lang && payload.lang !== "eng") {
                throw new Error("Only English OCR is available locally.");
            }
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker("eng", 1, {
                ...getOcrWorkerOptions(self.location.origin),
                logger: (message) => {
                    if (message.status === "recognizing text") {
                        reply(requestId, {
                            type: "progress",
                            progress: Math.round((message.progress ?? 0) * 100),
                        });
                    }
                },
            });
            try {
                await worker.setParameters({
                    tessedit_pageseg_mode: "1",
                    preserve_interword_spaces: "1",
                });
                const result = await worker.recognize(payload.imageData);
                reply(requestId, { type: "done", result: result.data });
            } finally {
                await worker.terminate();
            }
            return;
        }

        reply(requestId, { type: "error", error: `Unknown task: ${task}` });
    } catch (error) {
        reply(requestId, {
            type: "error",
            error: error?.message ?? "Worker processing failed",
        });
    }
});
