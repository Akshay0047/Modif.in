import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import Papa from "papaparse";
import { parseExcel } from "../../src/modules/docs/_shared/csvUtils.js";
import { baseURL, withBrowser } from "../text-and-shell/browserHarness.mjs";

// Run against a Vite dev/preview server using MODIF_BASE_URL when needed.
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
pdf.addPage([612, 792]);
const firstTablePage = pdf.addPage([612, 792]);
for (const [text, x, y] of [
    ["Name", 50, 700], ["Amount", 200, 700],
    ["Alice", 50, 680], ["12.50", 200, 680],
]) firstTablePage.drawText(text, { x, y, size: 12, font });
const continuation = pdf.addPage([612, 792]);
continuation.drawText("9.25", { x: 200, y: 700, size: 12, font });
const fixture = Buffer.from(await pdf.save());
const expectedRows = [
    { Page: "2", "Column 1": "Name", "Column 2": "Amount" },
    { Page: "2", "Column 1": "Alice", "Column 2": "12.50" },
    { Page: "3", "Column 1": "", "Column 2": "9.25" },
];

await withBrowser(async (page) => {
    const errors = [];
    const spreadsheetRequests = [];
    page.on("request", (request) => {
        if (/\/[^/]*xlsx[^/]*\.m?js(?:\?|$)/i.test(request.url())) spreadsheetRequests.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/doc/table-extractor`);
    await page.locator(".doc-tool-dropzone input[type=file]").setInputFiles({
        name: "blank-first-table.pdf", mimeType: "application/pdf", buffer: fixture,
    });
    await page.getByText("Table extracted successfully.", { exact: true }).waitFor();
    const output = page.locator("textarea[readonly]");
    const csv = await output.inputValue();
    assert.deepEqual(Papa.parse(csv, { header: true }).data, expectedRows);

    await page.getByRole("button", { name: "JSON", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value.startsWith("["));
    assert.deepEqual(JSON.parse(await output.inputValue()), expectedRows);
    const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: "Download", exact: true }).click(),
    ]);
    assert.equal(download.suggestedFilename(), "table.json");
    assert.deepEqual(JSON.parse(await readFile(await download.path(), "utf8")), expectedRows);

    await page.getByRole("button", { name: "CSV", exact: true }).click();
    await page.waitForFunction((expected) => document.querySelector("textarea[readonly]")?.value === expected, csv);

    await page.goto(`${baseURL}/doc/csv-converter`);
    await page.locator(".doc-tool-dropzone input[type=file]").setInputFiles({
        name: "inconsistent.csv", mimeType: "text/csv",
        buffer: Buffer.from("First,Last\nAlice,Brown,Unexpected\n"),
    });
    await page.getByRole("button", { name: "XML", exact: true }).click();
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    await page.getByText("CSV row 2 has 3 fields; expected 2.", { exact: true }).waitFor();
    assert.equal(await page.locator("textarea[readonly]").count(), 0);

    await page.locator(".doc-tool-dropzone input[type=file]").setInputFiles({
        name: "valid.csv", mimeType: "text/csv", buffer: Buffer.from("First,Last\nAlice,Brown\n"),
    });
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    await page.getByText("Conversion complete.", { exact: true }).waitFor();
    const xml = await page.locator("textarea[readonly]").inputValue();
    assert.match(xml, /<field name="First">Alice<\/field>/);
    assert.match(xml, /<field name="Last">Brown<\/field>/);
    assert.deepEqual(spreadsheetRequests, [], "PDF/CSV/XML work does not download the Excel engine");
    await page.getByRole("button", { name: "XLSX", exact: true }).click();
    assert.deepEqual(spreadsheetRequests, [], "Selecting Excel format alone does not download its engine");
    const exported = page.waitForEvent("download");
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    const workbook = await exported;
    assert.equal(workbook.suggestedFilename(), "valid.xlsx");
    assert.deepEqual(await parseExcel(await readFile(await workbook.path())), [{ First: "Alice", Last: "Brown" }]);
    assert.ok(spreadsheetRequests.length > 0, "Excel processing loads its engine on demand");
    assert.deepEqual(errors, []);
    console.log(`Table extraction, format toggles/download and CSV width validation passed at ${page.viewportSize().width}px`);
});
