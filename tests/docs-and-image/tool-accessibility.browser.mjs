import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { baseURL, withBrowser } from "../text-and-shell/browserHarness.mjs";

const pdf = await PDFDocument.create();
pdf.addPage([300, 400]);
const pdfBytes = Buffer.from(await pdf.save());
const signaturePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1kAAAAASUVORK5CYII=", "base64");

await withBrowser(async (page) => {
    for (const slug of ["compress-image", "crop-resize", "convert-to-jpg-png"]) {
        await page.goto(`${baseURL}/image/${slug}`);
        await page.locator("h1").waitFor();
        const layout = page.locator('.img-tool__layout, .cvt-jpg-png__layout');
        const panels = layout.locator(":scope > section");
        const first = await panels.nth(0).boundingBox();
        const second = await panels.nth(1).boundingBox();
        if (page.viewportSize().width < 760) assert.ok(first.y < second.y, `${slug}: DOM and mobile panel order agree`);
        else assert.ok(first.x < second.x, `${slug}: DOM and desktop panel order agree`);
        assert.equal(await panels.nth(0).locator('input[type="file"]').count(), 1, `${slug}: upload is in first panel`);
        const picker = page.locator('[role="button"]').filter({ has: page.locator('input[type="file"]') }).first();
        // The older crop workspace uses a native, visible file input instead.
        if (await picker.count()) {
            for (const key of ["Enter", "Space"]) {
                const opened = page.waitForEvent("filechooser");
                await picker.focus();
                await page.keyboard.press(key);
                await (await opened).setFiles([]);
            }
        }
    }

    await page.goto(`${baseURL}/image/placeholder-image-generator`);
    const border = page.getByRole("slider", { name: "Border width", exact: true });
    await border.focus();
    await border.press("ArrowRight");
    await page.getByLabel("Border color", { exact: true }).waitFor({ state: "visible" });

    await page.goto(`${baseURL}/doc/e-signature`);
    await page.locator('input[type="file"]').first().setInputFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: pdfBytes });
    await page.getByAltText("Page 1", { exact: true }).waitFor();
    const picture = page.getByRole("button", { name: "Select picture from device", exact: true });
    const opened = page.waitForEvent("filechooser");
    await picture.focus();
    await picture.press("Enter");
    await (await opened).setFiles({ name: "signature.png", mimeType: "image/png", buffer: signaturePng });
    for (const [label, value] of [["Left (px)", "60"], ["Top (px)", "55"], ["Width (px)", "120"], ["Height (px)", "48"], ["Rotation (degrees)", "15"]]) {
        await page.getByLabel(label, { exact: true }).fill(value);
        assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), value);
    }
    const stamp = page.locator(".doc-tool-stamp");
    assert.equal(await stamp.evaluate((node) => node.style.left), "60px");
    assert.equal(await stamp.evaluate((node) => node.style.transform), "rotate(15deg)");
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Apply & Download", exact: true }).click();
    const signed = await PDFDocument.load(await readFile(await (await downloaded).path()));
    assert.equal(signed.getPageCount(), 1);
});

console.log("Tool upload keyboard activation, panel order, conditional labels, and signature placement/export passed on desktop/mobile.");
