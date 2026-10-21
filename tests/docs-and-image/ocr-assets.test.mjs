import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import { getOcrAssets, ocrAssetsPlugin } from "../../scripts/ocrAssetsPlugin.js";
import { getOcrWorkerOptions } from "../../src/modules/docs/_shared/ocrConfig.js";

test("OCR worker, both LSTM cores, and the English model are emitted from installed packages", async () => {
    const emitted = [];
    await ocrAssetsPlugin().generateBundle.call({ emitFile: (asset) => emitted.push(asset) });
    assert.deepEqual(emitted.map((asset) => asset.fileName).sort(), [
        "ocr-assets/eng.traineddata.gz",
        "ocr-assets/tesseract-core-lstm.wasm.js",
        "ocr-assets/tesseract-core-simd-lstm.wasm.js",
        "ocr-assets/worker.min.js",
        "ocr-assets/worker.min.js.LICENSE.txt",
    ]);
    const sources = getOcrAssets();
    for (const asset of emitted) {
        assert.deepEqual(asset.source, await readFile(sources.get(asset.fileName.split("/").at(-1))));
    }
    const model = emitted.find((asset) => asset.fileName.endsWith(".gz"));
    assert.ok(gunzipSync(model.source).byteLength > 1_000_000);
    assert.ok(emitted.reduce((total, asset) => total + asset.source.byteLength, 0) < 12_000_000, "only the compact LSTM model and cores should ship");
});

test("OCR configuration uses only same-origin assets and keeps Tesseract's SIMD selection", () => {
    const options = getOcrWorkerOptions("https://modif.in");
    assert.equal(options.workerPath, "https://modif.in/ocr-assets/worker.min.js");
    assert.equal(options.corePath, "https://modif.in/ocr-assets/");
    assert.equal(options.langPath, "https://modif.in/ocr-assets/");
    assert.equal(options.workerBlobURL, false);
    assert.equal(options.gzip, true);
    assert.ok(getOcrAssets().has(new URL(options.workerPath).pathname.split("/").at(-1)));
    assert.ok(getOcrAssets().has(new URL("eng.traineddata.gz", options.langPath).pathname.split("/").at(-1)));
});
