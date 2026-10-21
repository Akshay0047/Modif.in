import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createServer, request as forwardRequest } from "node:http";
import { chromium } from "playwright";
import { baseURL, waitForPageReveal } from "../text-and-shell/browserHarness.mjs";

// A proxy sees nested Tesseract-worker traffic, which Playwright's context
// request interception does not reliably observe. Keep every request local.
const origin = new URL(baseURL);
assert.equal(origin.protocol, "http:", "run this network regression against a local HTTP preview");
const external = [];
const requests = [];
const proxy = createServer((request, response) => {
    const url = new URL(request.url);
    if (url.origin !== origin.origin) {
        external.push(url.href);
        response.writeHead(403).end();
        return;
    }
    requests.push({ path: url.pathname, method: request.method });
    const upstream = forwardRequest(url, { method: request.method, headers: request.headers }, (result) => {
        response.writeHead(result.statusCode, result.headers);
        result.pipe(response);
    });
    upstream.on("error", () => response.writeHead(502).end());
    request.pipe(upstream);
});
proxy.on("connect", (request, socket) => {
    external.push(`https://${request.url}`);
    socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
    headless: true,
});
try {
    const context = await browser.newContext({
        reducedMotion: "reduce",
        proxy: { server: `http://127.0.0.1:${proxy.address().port}`, bypass: "<-loopback>" },
    });
    const ocrAssets = () => requests.filter(({ path }) => path.startsWith("/ocr-assets/")).map(({ path }) => path);
    const page = await context.newPage();
    await page.goto(`${baseURL}/doc/ocr`);
    await waitForPageReveal(page);
    assert.deepEqual(ocrAssets(), [], "opening OCR must not download its engine or language data");
    const image = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 220;
        const drawing = canvas.getContext("2d");
        drawing.fillStyle = "white";
        drawing.fillRect(0, 0, canvas.width, canvas.height);
        drawing.fillStyle = "black";
        drawing.font = "64px Arial";
        drawing.fillText("MODIF LOCAL OCR", 70, 130);
        return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.locator('input[type="file"]').setInputFiles({
        name: "private-local-ocr.png",
        mimeType: "image/png",
        buffer: Buffer.from(image, "base64"),
    });
    const result = page.getByRole("textbox", { name: "Recognized text", exact: true });
    await result.waitFor({ timeout: 90000 });
    assert.match(await result.inputValue(), /MODIF\s+LOCAL\s+OCR/i);
    // Edge may attempt its own browser-service requests through the context
    // proxy. They remain blocked; distinguish them from application traffic.
    const browserServices = new Set(["edge.microsoft.com", "www.bing.com", "mss.office.com", "substrate.office.com"]);
    assert.deepEqual(external.filter((url) => !browserServices.has(new URL(url).hostname)), [], "OCR must not request third-party application resources");
    assert.ok(ocrAssets().includes("/ocr-assets/worker.min.js"));
    assert.ok(ocrAssets().some((path) => /tesseract-core-(?:simd-)?lstm\.wasm\.js$/.test(path)));
    assert.ok(ocrAssets().includes("/ocr-assets/eng.traineddata.gz"));
    assert.ok(requests.every(({ method }) => method === "GET"), "OCR input must not be uploaded");
    await context.close();
    console.log("Local OCR output, lazy assets, and same-origin network checks passed.");
} finally {
    await browser.close();
    proxy.closeAllConnections();
    await new Promise((resolve) => proxy.close(resolve));
}
