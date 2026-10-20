import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { baseURL, withBrowser } from "../text-and-shell/browserHarness.mjs";

const input = await PDFDocument.create();
input.addPage([200, 300]);
const bytes = Buffer.from(await input.save());
const files = ["one.pdf", "two.pdf"].map((name) => ({
    name, mimeType: "application/pdf", buffer: bytes,
}));

await withBrowser(async (page) => {
    const errors = [];
    const workers = [];
    page.on("worker", (worker) => workers.push(worker.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/doc/pdf-merger`);
    await page.locator('input[type="file"]').setInputFiles(files);
    assert.equal(workers.length, 0, "Opening the tool and selecting files does not start document workers");
    const completed = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save & Download", exact: true }).click();
    const download = await completed;
    const merged = await PDFDocument.load(await readFile(await download.path()));
    assert.equal(merged.getPageCount(), 2);
    assert.equal(workers.filter((url) => /docWorker/.test(url)).length, 1, "Processing creates its worker on demand");
    assert.deepEqual(errors, []);

    // A worker that never replies reproduces leaving a tool while processing.
    await page.route(/docWorker(?:-[^/?]+)?\.js(?:\?.*)?$/, (route) =>
        route.fulfill({ contentType: "text/javascript", body: "self.onmessage = () => {};" }));
    await page.addInitScript(() => {
        const original = window.setTimeout;
        window.documentTaskTimeouts = 0;
        window.setTimeout = (callback, delay, ...args) => {
            if (delay === 180000) {
                return original(() => {
                    window.documentTaskTimeouts += 1;
                    callback(...args);
                }, 1000);
            }
            return original(callback, delay, ...args);
        };
    });
    await page.reload();
    await page.locator('input[type="file"]').setInputFiles(files);
    const unwantedDownloads = [];
    page.on("download", (item) => unwantedDownloads.push(item.suggestedFilename()));
    await page.getByRole("button", { name: "Save & Download", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Save & Download", exact: true }).isDisabled(), true);
    await page.getByRole("link", { name: "MODIF.in home", exact: true }).click();
    await page.waitForURL(`${baseURL}/`);
    await page.waitForTimeout(1250);
    assert.equal(await page.evaluate(() => window.documentTaskTimeouts), 0);
    assert.deepEqual(unwantedDownloads, []);
    assert.deepEqual(errors, []);
});

console.log("Document worker merge and navigation cancellation passed on desktop and mobile.");
