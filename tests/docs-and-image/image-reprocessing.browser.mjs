import assert from "node:assert/strict";
import JSZip from "jszip";
import { baseURL, withBrowser, waitForPageReveal } from "../text-and-shell/browserHarness.mjs";

// Run against the Vite dev server: the decoder boundary is mocked to cover
// output failure/recovery deterministically without a platform HEIC decoder.
async function downloadedBytes(download) {
    const chunks = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk);
    return Buffer.concat(chunks);
}

await withBrowser(async (page, context) => {
    await page.addInitScript(() => {
        window.revokedUrls = [];
        const revoke = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (url) => { window.revokedUrls.push(url); revoke(url); };
        const read = FileReader.prototype.readAsArrayBuffer;
        FileReader.prototype.readAsArrayBuffer = function (file) {
            if (!window.holdFileRead) return read.call(this, file);
            window.holdFileRead = false;
            window.resumeFileRead = () => {
                this.addEventListener("loadend", () => {
                    setTimeout(() => { window.cancelledReadSettled = true; }, 0);
                });
                read.call(this, file);
            };
        };
    });
    await page.route("**/heic2any.js*", (route) => route.fulfill({
        contentType: "text/javascript",
        body: `export default async function ({ toType }) {
            if (window.failHeic) throw new Error("Forced reconversion failure");
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 120;
            return new Promise(resolve => canvas.toBlob(resolve, toType));
        }`,
    }));
    await page.goto(`${baseURL}/image/heic-to-jpg`);
    await waitForPageReveal(page);
    await page.locator('input[type="file"]').setInputFiles({
        name: "photo.heic", mimeType: "image/heic", buffer: Buffer.from("decoder fixture"),
    });
    await page.getByText("1 file(s) processed.", { exact: true }).waitFor();
    const originalThumb = await page.locator(".img-tool__list-thumb").getAttribute("src");
    await page.evaluate(() => { window.failHeic = true; });
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    await page.getByText(/Forced reconversion failure/).waitFor();
    assert.equal(await page.getByRole("button", { name: "Download", exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "Download All as ZIP" }).isDisabled(), true);
    assert.equal(await page.locator("img.img-tool__list-thumb").count(), 0);
    assert.equal(await page.evaluate((url) => window.revokedUrls.includes(url), originalThumb), true);

    await page.evaluate(() => { window.failHeic = false; });
    await page.getByRole("button", { name: "JPG", exact: true }).click();
    await page.getByRole("button", { name: "Download", exact: true }).waitFor();
    await page.waitForFunction(() => Boolean(document.querySelector("img.img-tool__list-thumb")));
    const recoveredThumb = await page.locator(".img-tool__list-thumb").getAttribute("src");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    await page.waitForFunction((old) => {
        const thumb = document.querySelector("img.img-tool__list-thumb");
        return thumb && thumb.src !== old;
    }, recoveredThumb);
    const pngDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const png = await pngDownload;
    assert.equal(png.suggestedFilename(), "photo.png");
    assert.deepEqual([...(await downloadedBytes(png)).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(await page.evaluate((url) => window.revokedUrls.includes(url), recoveredThumb), true);

    await page.goto(`${baseURL}/image/bulk-image-processor`);
    await waitForPageReveal(page);
    const imageBytes = Buffer.from(await page.evaluate(async () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 120;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        return [...new Uint8Array(await blob.arrayBuffer())];
    }));
    const fixture = (name) => ({ name, mimeType: "image/png", buffer: imageBytes });
    await page.locator('input[type="file"]').setInputFiles(fixture("old.png"));
    await page.evaluate(() => { window.holdFileRead = true; });
    await page.getByRole("button", { name: "Start Batch", exact: true }).click();
    await page.waitForFunction(() => typeof window.resumeFileRead === "function");
    await page.locator(".img-tool__dropzone").evaluate((element, bytes) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([new Uint8Array(bytes)], "during-run.png", { type: "image/png" }));
        element.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true }));
    }, [...imageBytes]);
    assert.deepEqual(await page.locator(".img-tool__list-name").allTextContents(), ["old.png"]);
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(fixture("new.png"));
    await page.evaluate(() => window.resumeFileRead());
    await page.waitForFunction(() => window.cancelledReadSettled === true);
    assert.deepEqual(await page.locator(".img-tool__list-name").allTextContents(), ["new.png"]);
    assert.equal(await page.locator(".img-tool__pill").textContent(), "pending");
    await page.getByRole("button", { name: "Start Batch", exact: true }).click();
    await page.getByText("1 file(s) processed successfully.", { exact: true }).waitFor();
    assert.equal(await page.locator(".img-tool__pill").textContent(), "done");

    await page.goto(`${baseURL}/image/favicon-generator`);
    await waitForPageReveal(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Create Lettermark", exact: true }).click();
    for (const size of [16, 32, 180, 192, 512]) {
        await page.getByRole("checkbox", { name: `${size}×${size}`, exact: true }).uncheck();
    }
    await page.getByRole("button", { name: "Copy HTML Snippet", exact: true }).click();
    await page.getByText("HTML snippet copied.", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()),
        '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">');
    const faviconDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download.*ZIP/i }).click();
    const pack = await JSZip.loadAsync(await downloadedBytes(await faviconDownload));
    assert.deepEqual(Object.keys(pack.files).sort(), ["favicon-48x48.png", "site.webmanifest"]);
    assert.deepEqual(JSON.parse(await pack.file("site.webmanifest").async("string")).icons, []);

    await page.goto(`${baseURL}/image/image-splitter`);
    await waitForPageReveal(page);
    await page.locator('input[type="file"]').setInputFiles(fixture("grid.png"));
    const slicesDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Slices as ZIP", exact: true }).click();
    const slices = await JSZip.loadAsync(await downloadedBytes(await slicesDownload));
    assert.equal(Object.keys(slices.files).length, 9);
    for (const entry of Object.values(slices.files)) {
        const bytes = await entry.async("nodebuffer");
        assert.equal(bytes.readUInt32BE(16), 40);
        assert.equal(bytes.readUInt32BE(20), 40);
    }
});

console.log("Image reprocessing, cancellation, favicon packs, and slice exports passed at desktop and mobile sizes.");
