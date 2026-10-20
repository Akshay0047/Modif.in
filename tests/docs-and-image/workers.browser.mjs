import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { baseURL, withBrowser, waitForPageReveal } from "../text-and-shell/browserHarness.mjs";

const input = await PDFDocument.create();
input.addPage([200, 300]);
const bytes = Buffer.from(await input.save());
const files = ["one.pdf", "two.pdf"].map((name) => ({
    name, mimeType: "application/pdf", buffer: bytes,
}));

await withBrowser(async (page) => {
    const errors = [];
    const workers = [];
    const processingRequests = [];
    page.on("request", (request) => {
        if (/\/(?:pdfUtils(?:-|\.js)|docWorker)/.test(request.url())) processingRequests.push(request.url());
    });
    page.on("worker", (worker) => workers.push(worker.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/doc/pdf-merger`);
    await waitForPageReveal(page);
    await page.locator('input[type="file"]').setInputFiles(files);
    assert.equal(workers.length, 0, "Opening the tool and selecting files does not start document workers");
    assert.deepEqual(processingRequests, [], "An empty merger does not load document processing engines");
    const completed = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save & Download", exact: true }).click();
    const download = await completed;
    const merged = await PDFDocument.load(await readFile(await download.path()));
    assert.equal(merged.getPageCount(), 2);
    assert.equal(workers.filter((url) => /docWorker/.test(url)).length, 1, "Processing creates its worker on demand");
    assert.deepEqual(errors, []);

    // The main-thread fallback remains available when worker construction fails.
    await page.addInitScript(() => {
        const NativeWorker = window.Worker;
        window.Worker = new Proxy(NativeWorker, {
            construct(target, args, newTarget) {
                if (String(args[0]).includes("docWorker") && sessionStorage.getItem("block-document-worker") === "true") {
                    throw new Error("Document worker blocked for fallback QA");
                }
                return Reflect.construct(target, args, newTarget);
            },
        });
    });
    await page.evaluate(() => sessionStorage.setItem("block-document-worker", "true"));
    await page.reload();
    await waitForPageReveal(page);
    await page.locator('input[type="file"]').setInputFiles(files);
    const fallback = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save & Download", exact: true }).click();
    const fallbackResult = await fallback;
    const mergedWithoutWorker = await PDFDocument.load(await readFile(await fallbackResult.path()));
    assert.equal(mergedWithoutWorker.getPageCount(), 2);
    assert.equal(await page.locator(".doc-tool-status--error").count(), 0, "A successful fallback does not retain the earlier worker failure");
    assert.ok(processingRequests.some((url) => /\/pdfUtils-/.test(url) || /\/pdfUtils\.js/.test(url)), "A blocked worker loads the merge fallback on demand");
    await page.evaluate(() => sessionStorage.removeItem("block-document-worker"));

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
    await waitForPageReveal(page);
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

await withBrowser(async (page) => {
    await page.addInitScript(() => {
        const NativeWorker = window.Worker;
        window.Worker = new Proxy(NativeWorker, {
            construct(target, args, newTarget) {
                if (String(args[0]).includes("docWorker")) throw new Error("Blocked worker for delayed fallback QA");
                return Reflect.construct(target, args, newTarget);
            },
        });
    });
    const other = await PDFDocument.create();
    other.addPage([400, 500]);
    const orderedFiles = [files[0], { name: "different.pdf", mimeType: "application/pdf", buffer: Buffer.from(await other.save()) }];
    const downloads = [];
    page.on("download", (download) => downloads.push(download));
    const pattern = /\/pdfUtils(?:-[^/?]+)?\.js(?:\?.*)?$/;

    for (const action of ["clear", "reorder", "leave"]) {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        await page.route(pattern, async (route) => {
            await gate;
            await route.continue();
        });
        await page.goto(`${baseURL}/doc/pdf-merger`);
        await waitForPageReveal(page);
        await page.locator('input[type="file"]').setInputFiles(orderedFiles);
        const stalled = page.waitForRequest(pattern);
        await page.getByRole("button", { name: "Save & Download", exact: true }).click();
        const moduleURL = (await stalled).url();
        assert.equal(await page.getByRole("button", { name: "Save & Download", exact: true }).isDisabled(), true, "Busy ownership covers the cold fallback import");
        assert.equal(await page.getByRole("button", { name: "Preview Merged PDF", exact: true }).isDisabled(), true);
        const countBefore = downloads.length;
        if (action === "clear") await page.getByRole("button", { name: "Clear All", exact: true }).click();
        else if (action === "reorder") await page.getByRole("button", { name: "Down", exact: true }).first().click();
        else await page.getByRole("link", { name: "MODIF.in home", exact: true }).click();
        const loaded = page.waitForResponse(pattern);
        release();
        await loaded;
        // Await the same module and two frames: the cancelled continuation has
        // actually settled, rather than merely remaining hidden by the gate.
        await page.evaluate((url) => import(url), moduleURL);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.equal(downloads.length, countBefore, `${action} invalidates the old merge before it can download`);
        assert.equal(await page.getByText("Merged PDF downloaded successfully.", { exact: true }).count(), 0);
        if (action === "reorder") {
            const currentDownload = page.waitForEvent("download");
            await page.getByRole("button", { name: "Save & Download", exact: true }).click();
            const result = await PDFDocument.load(await readFile(await (await currentDownload).path()));
            assert.deepEqual(result.getPages().map((pdfPage) => pdfPage.getWidth()), [400, 200], "Only the current file order is merged");
            assert.equal(await page.locator(".doc-tool-status--error").count(), 0);
        }
        await page.unroute(pattern);
    }
});

console.log("Document worker lazy startup, merge, fallback busy state, source/unmount cancellation and retry passed on desktop and mobile.");
