import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).href;

self.addEventListener("message", async (event) => {
    const { task, payload } = event.data ?? {};

    try {
        if (task === "merge") {
            const merged = await PDFDocument.create();
            const total = payload.buffers.length;
            for (let i = 0; i < total; i += 1) {
                const source = await PDFDocument.load(payload.buffers[i], {
                    ignoreEncryption: true,
                });
                const pages = await merged.copyPages(source, source.getPageIndices());
                pages.forEach((page) => merged.addPage(page));
                self.postMessage({ type: "progress", progress: ((i + 1) / total) * 100 });
            }
            const result = await merged.save();
            self.postMessage({ type: "done", result });
            return;
        }

        if (task === "compress") {
            const pdf = await pdfjs.getDocument({ data: payload.buffer }).promise;
            const output = await PDFDocument.create();
            const quality = payload.quality ?? 0.6;
            const scale = payload.scale ?? 1.2;

            for (let i = 1; i <= pdf.numPages; i += 1) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale });
                const canvas = new OffscreenCanvas(viewport.width, viewport.height);
                const ctx = canvas.getContext("2d");
                await page.render({ canvasContext: ctx, viewport }).promise;
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

                self.postMessage({
                    type: "progress",
                    progress: (i / pdf.numPages) * 100,
                });
            }

            pdf.destroy();
            const result = await output.save();
            self.postMessage({ type: "done", result });
            return;
        }

        if (task === "ocr") {
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker(payload.lang ?? "eng");
            const result = await worker.recognize(payload.imageData);
            await worker.terminate();
            self.postMessage({ type: "done", result: result.data });
            return;
        }

        self.postMessage({ type: "error", error: `Unknown task: ${task}` });
    } catch (error) {
        self.postMessage({
            type: "error",
            error: error?.message ?? "Worker processing failed",
        });
    }
});
