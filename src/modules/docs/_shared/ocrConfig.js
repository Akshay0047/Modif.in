export const OCR_ASSET_PATH = "/ocr-assets";

export function getOcrWorkerOptions(origin) {
    const base = new URL(`${OCR_ASSET_PATH}/`, origin);
    return {
        workerPath: new URL("worker.min.js", base).href,
        workerBlobURL: false,
        corePath: base.href,
        langPath: base.href,
        gzip: true,
        cachePath: "modif-ocr-eng-1.0.0",
    };
}
