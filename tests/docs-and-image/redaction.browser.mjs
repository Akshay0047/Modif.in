import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream, degrees } from "pdf-lib";
import { withBrowser, baseURL } from "../text-and-shell/browserHarness.mjs";

const marker = "CONFIDENTIAL-12345";
const source = await PDFDocument.create();
const font = await source.embedFont(StandardFonts.Helvetica);
const secret = source.context.register(source.context.flateStream(
    `BT /F1 12 Tf 30 60 Td (${marker}) Tj ET`,
    { Type: "XObject", Subtype: "Form", BBox: [0, 0, 200, 300], Resources: { Font: { F1: font.ref } } },
));
const resources = source.context.obj({ XObject: { Secret: secret } });
const first = source.addPage([200, 300]);
first.setCropBox(20, 30, 160, 240);
first.setRotation(degrees(90));
first.node.set(PDFName.of("Resources"), resources);
first.node.set(PDFName.of("Contents"), source.context.register(source.context.flateStream("q /Secret Do Q")));
// Unused resources on another page must not carry the redacted source object.
source.addPage([100, 200]).node.set(PDFName.of("Resources"), resources);
const bytes = Buffer.from(await source.save());

const streams = (pdf) => pdf.context.enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFRawStream)
    .map(([, object]) => new TextDecoder().decode(decodePDFRawStream(object).decode()));
assert(streams(await PDFDocument.load(bytes)).some((stream) => stream.includes(marker)));

await withBrowser(async (page) => {
    await page.goto(`${baseURL}/doc/redaction-tool`);
    await page.locator('input[type="file"]').setInputFiles({ name: "shared-secret.pdf", mimeType: "application/pdf", buffer: bytes });
    const canvas = page.locator(".doc-tool-canvas-wrap canvas");
    await page.waitForFunction(() => document.querySelector(".doc-tool-canvas-wrap canvas")?.width === 360);
    await canvas.scrollIntoViewIfNeeded();
    const rect = await canvas.boundingBox();
    await page.mouse.move(rect.x + rect.width * 0.05, rect.y + rect.height * 0.05);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.95, rect.y + rect.height * 0.95, { steps: 5 });
    await page.mouse.up();
    const apply = page.getByRole("button", { name: "Apply Redactions (1)", exact: true });
    await apply.waitFor();
    const [download] = await Promise.all([page.waitForEvent("download"), apply.click()]);
    const result = await PDFDocument.load(await readFile(await download.path()));
    assert.equal(result.getPageCount(), 2);
    assert.deepEqual(result.getPages().map((item) => item.getSize()), [{ width: 240, height: 160 }, { width: 100, height: 200 }]);
    assert(!streams(result).some((stream) => stream.includes(marker)), "redacted source content remains recoverable");
    assert(result.getPages().every((item) => item.node.Resources().lookup(PDFName.of("XObject")).keys().length > 0));
    console.log(`Redaction source isolation and rotated crop geometry passed at ${page.viewportSize().width}px`);
});
