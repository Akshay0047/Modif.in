import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseExcel } from "../../src/modules/docs/_shared/csvUtils.js";
import { baseURL, withBrowser } from "../text-and-shell/browserHarness.mjs";

const excelChunk = /\/[^/]*xlsx[^/]*\.m?js(?:\?|$)/i;
const csvFile = (name, value) => ({
    name, mimeType: "text/csv", buffer: Buffer.from(`Name,Group\n${value},Current\n`),
});

await withBrowser(async (page) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
        window.documentDownloads = [];
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (...args) {
            if (this.hasAttribute("download")) window.documentDownloads.push(this.download);
            return click.apply(this, args);
        };
    });

    for (const action of ["remove", "replace", "unmount"]) {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        const delayImport = async (route) => { await gate; await route.continue(); };
        await page.route(excelChunk, delayImport);
        try {
            await page.goto(`${baseURL}/doc/csv-converter`);
            const picker = page.locator('.doc-tool-dropzone input[type="file"]');
            const convert = page.getByRole("button", { name: "Convert", exact: true });
            await picker.setInputFiles(csvFile("original.csv", "Original"));
            await page.getByRole("button", { name: "XLSX", exact: true }).click();
            const requested = page.waitForRequest(excelChunk);
            await convert.click();
            const importURL = (await requested).url();
            assert.equal(await convert.isDisabled(), true, "Excel loading belongs to the active conversion");
            assert.equal(await convert.getAttribute("aria-busy"), "true");

            let expectedDownload;
            if (action === "remove") {
                await page.getByRole("button", { name: "Remove", exact: true }).click();
                assert.equal(await convert.isDisabled(), true, "Removing the file clears the conversion input");
            } else if (action === "replace") {
                await picker.setInputFiles(csvFile("replacement.csv", "Replacement"));
                // The previous operation must not prevent a new source from being converted.
                await page.waitForFunction(() => !document.querySelector('button[aria-busy]')?.disabled);
                expectedDownload = page.waitForEvent("download");
                await convert.click();
                assert.equal(await convert.getAttribute("aria-busy"), "true");
            } else {
                await page.getByRole("link", { name: "MODIF.in home", exact: true }).click();
                await page.waitForURL(`${baseURL}/`);
            }

            release();
            // Await the actual delayed engine and its conversion continuations, without an arbitrary network sleep.
            await page.evaluate(async (url) => {
                await import(/* @vite-ignore */ url);
                await new Promise((resolve) => setTimeout(resolve, 0));
            }, importURL);

            if (expectedDownload) {
                const workbook = await expectedDownload;
                assert.equal(workbook.suggestedFilename(), "replacement.xlsx");
                assert.deepEqual(await parseExcel(await readFile(await workbook.path())), [{ Name: "Replacement", Group: "Current" }]);
                await page.getByText("Excel file downloaded.", { exact: true }).waitFor();
                assert.equal(await convert.getAttribute("aria-busy"), "false");
                assert.deepEqual(await page.evaluate(() => window.documentDownloads), ["replacement.xlsx"], "Only the current source exports");
            } else {
                assert.deepEqual(await page.evaluate(() => window.documentDownloads), [], `A ${action === "remove" ? "removed source" : "departed tool"} cannot export after its engine loads`);
                assert.equal(await page.getByText("Excel file downloaded.", { exact: true }).count(), 0);
                assert.equal(await page.getByText("Converting…", { exact: true }).count(), 0);
            }
        } finally {
            release();
            await page.unroute(excelChunk, delayImport);
        }
    }
    assert.deepEqual(errors, []);
    console.log(`Delayed Excel export ignores removal, replacement, and unmount at ${page.viewportSize().width}px`);
});
