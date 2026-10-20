import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { baseURL, withBrowser, waitForPageReveal } from "../text-and-shell/browserHarness.mjs";

const formPdf = await PDFDocument.create();
const formPage = formPdf.addPage();
const form = formPdf.getForm();
const name = form.createTextField("full_name");
name.setText("Initial name");
name.addToPage(formPage, { x: 50, y: 700, width: 200, height: 24 });
form.createCheckBox("approved").addToPage(formPage, { x: 50, y: 650, width: 20, height: 20 });
const formBytes = Buffer.from(await formPdf.save());
const editorPdf = await PDFDocument.create();
editorPdf.addPage([200, 300]);
editorPdf.addPage([400, 200]);
const editorBytes = Buffer.from(await editorPdf.save());
const upload = (page, bytes) => page.locator('input[type="file"]').first().setInputFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: bytes });
const save = async (page, buttonName) => {
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: buttonName, exact: true }).click()]);
    return PDFDocument.load(await readFile(await download.path()));
};
const contentOf = (pdf, pdfPage) => {
    const array = pdfPage.node.Contents();
    return Array.from({ length: array?.size() ?? 0 }, (_, index) => pdf.context.lookup(array.get(index)))
        .filter((object) => object instanceof PDFRawStream)
        .map((object) => new TextDecoder().decode(decodePDFRawStream(object).decode())).join("\n");
};
const textPosition = (content) => {
    let matrix = [1, 0, 0, 1, 0, 0];
    const stack = [];
    const point = ([a, b, c, d, e, f], x, y) => [a * x + c * y + e, b * x + d * y + f];
    for (const line of content.split("\n")) {
        if (line === "q") stack.push(matrix);
        else if (line === "Q") matrix = stack.pop();
        else if (line.endsWith(" cm")) {
            const [a, b, c, d, e, f] = line.split(" ").slice(0, 6).map(Number);
            const [ma, mb, mc, md] = matrix;
            const [x, y] = point(matrix, e, f);
            matrix = [ma * a + mc * b, mb * a + md * b, ma * c + mc * d, mb * c + md * d, x, y];
        } else if (line.endsWith(" Tm")) {
            const values = line.split(" ").map(Number);
            return point(matrix, values[4], values[5]);
        }
    }
    throw new Error("The export contains no text annotation");
};

await withBrowser(async (page) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/doc/fillable-form-tools`);
    await waitForPageReveal(page);
    await upload(page, formBytes);
    await page.getByLabel("full_name", { exact: true }).fill("Updated name");
    await page.getByLabel("approved", { exact: true }).check();
    const filled = (await save(page, "Save Filled PDF")).getForm();
    assert.equal(filled.getTextField("full_name").getText(), "Updated name");
    assert.equal(filled.getCheckBox("approved").isChecked(), true);

    for (const slug of ["pdf-splitter", "page-organizer", "e-signature", "redaction-tool"]) {
        await page.goto(`${baseURL}/doc/${slug}`);
        await waitForPageReveal(page);
        await upload(page, Buffer.from("malformed PDF"));
        await page.getByText(/Invalid PDF|Could not read/i).first().waitFor();
        await upload(page, editorBytes);
        await page.locator(slug === "redaction-tool" ? ".doc-tool-canvas-wrap canvas" : slug === "e-signature" ? 'img[alt="Page 1"]' : ".doc-tool-thumbnail, .doc-tool-thumb, .doc-tool-panel img").first().waitFor();
    }

    await page.goto(`${baseURL}/doc/e-signature`);
    await waitForPageReveal(page);
    const signature = page.getByLabel("Signature drawing area");
    await signature.scrollIntoViewIfNeeded();
    const signatureRect = await signature.boundingBox();
    assert(signatureRect.width <= page.viewportSize().width);
    const touch = await page.context().newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: signatureRect.x + 20, y: signatureRect.y + 20 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: signatureRect.x + 80, y: signatureRect.y + 50 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
    assert(await signature.evaluate((canvas) => canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0)));

    let releaseWorker;
    const gate = new Promise((resolve) => { releaseWorker = resolve; });
    await page.route("**/*pdf.worker*", async (route) => { await gate; await route.continue(); });
    await page.goto(`${baseURL}/doc/pdf-editor`);
    await waitForPageReveal(page);
    await upload(page, editorBytes);
    const saveButton = page.getByRole("button", { name: "Save & Download", exact: true });
    await saveButton.waitFor();
    assert(await saveButton.isDisabled(), "Save was enabled before the worker rendered the page");
    releaseWorker();
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "Save & Download" && !button.disabled));
    await page.getByPlaceholder("Text to place — click on page").fill("First page");
    const canvas = page.locator(".doc-tool-canvas-wrap canvas");
    await canvas.click({ position: { x: 75, y: 120 } });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".doc-tool-canvas-wrap canvas")?.width === 600);
    const annotated = await save(page, "Save & Download");
    const [x, y] = textPosition(contentOf(annotated, annotated.getPage(0)));
    assert(Math.abs(x - 50) < 1 && Math.abs(y - 220) < 1, `annotation on page 1 used the wrong scale: ${x}, ${y}`);
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(`Forms, failed uploads, touch signature and editor readiness/scale passed at ${page.viewportSize().width}px`);
});
