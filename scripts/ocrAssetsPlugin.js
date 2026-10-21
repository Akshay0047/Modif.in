import { readFile } from "node:fs/promises";
import { OCR_ASSET_PATH } from "../src/modules/docs/_shared/ocrConfig.js";

export function getOcrAssets() {
    const workerPackage = import.meta.resolve("tesseract.js/package.json");
    const corePackage = import.meta.resolve("tesseract.js-core/package.json");
    const languagePackage = import.meta.resolve("@tesseract.js-data/eng/package.json");
    return new Map([
        ["worker.min.js", new URL("dist/worker.min.js", workerPackage)],
        ["worker.min.js.LICENSE.txt", new URL("dist/worker.min.js.LICENSE.txt", workerPackage)],
        // The .wasm.js distributions embed WASM. Keep SIMD and non-SIMD
        // LSTM cores; no legacy engine or duplicate .wasm payload is needed.
        ["tesseract-core-lstm.wasm.js", new URL("tesseract-core-lstm.wasm.js", corePackage)],
        ["tesseract-core-simd-lstm.wasm.js", new URL("tesseract-core-simd-lstm.wasm.js", corePackage)],
        ["eng.traineddata.gz", new URL("4.0.0_best_int/eng.traineddata.gz", languagePackage)],
    ]);
}

export function ocrAssetsPlugin() {
    const assets = getOcrAssets();
    return {
        name: "modif-local-ocr-assets",
        async generateBundle() {
            for (const [name, path] of assets) {
                this.emitFile({
                    type: "asset",
                    fileName: `${OCR_ASSET_PATH.slice(1)}/${name}`,
                    source: await readFile(path),
                });
            }
        },
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                let pathname;
                try {
                    pathname = new URL(request.url, "http://localhost").pathname;
                } catch {
                    response.statusCode = 400;
                    response.end();
                    return;
                }
                if (!pathname.startsWith(`${OCR_ASSET_PATH}/`)) return next();
                const path = assets.get(pathname.slice(OCR_ASSET_PATH.length + 1));
                if (!path || !["GET", "HEAD"].includes(request.method)) {
                    response.statusCode = 404;
                    response.end();
                    return;
                }
                try {
                    const bytes = await readFile(path);
                    response.setHeader("Content-Type", pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "application/gzip");
                    response.setHeader("Cache-Control", "no-cache");
                    response.end(request.method === "HEAD" ? undefined : bytes);
                } catch (error) { next(error); }
            });
        },
    };
}
