// Build first, then run against MODIF_BASE_URL (production preview, default 4173).
// PLAYWRIGHT_MODULE may point to external QA tooling; fixtures/downloads stay in OS temp.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { baseURL, withBrowser } from "./browserHarness.mjs";

// Independently encoded 96×64 RGBA PNG: red/green top quadrants, blue/yellow bottom.
const fixture = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAGAAAABACAYAAADlNHIOAAAA2ElEQVR4nO3RwREDMQCDQPfftFNEHhgdo1ED7LnnXPMHxkcMQPyB8REDEH9gfMQAxB8YHzEA8QfGRwxA/IHxEQMQf2B8xADEHxgfMQDxB8ZHDED8gfERAxB/YHzEAMQfGB8xAPEHxkcMQPyB8REDEH9gfMQAxB8YH/HTAA80/Ov3HvUDCCAAPGIA4tMBA3ggYgDiBxBAAHjEAMSnAwbwQMQAxA8ggADwiAGITwcM4IGIAYgfQAAB4BEDEJ8OGMADEQMQP4AAAsAjBiA+HTCAByIGIH4AlwX4AXT0zRyGZp+BAAAAAElFTkSuQmCC", "base64");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const colors = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 255, 0, 255]];
const file = { name: "quadrants.png", mimeType: "image/png", buffer: fixture };

async function download(page, name = "Download") {
    const button = page.getByRole("button", { name, exact: true });
    await page.waitForFunction((name) => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === name && !button.disabled), name);
    const [result] = await Promise.all([page.waitForEvent("download"), button.click()]);
    return readFile(await result.path());
}

async function inspectImage(page, bytes, mime, width, height, expectedColors, tolerance = 0) {
    if (mime === "image/png") {
        assert.ok(bytes.subarray(0, 8).equals(pngSignature), "download has real PNG bytes");
        assert.equal(bytes.readUInt32BE(16), width, "PNG IHDR width");
        assert.equal(bytes.readUInt32BE(20), height, "PNG IHDR height");
    } else {
        assert.ok(bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])), "download has real JPEG bytes");
    }
    const pixels = await page.evaluate(async ({ uri }) => {
        const image = new Image();
        image.src = uri;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const samples = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([x, y]) => [...context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data]);
        return { width: canvas.width, height: canvas.height, samples };
    }, { uri: `data:${mime};base64,${bytes.toString("base64")}` });
    assert.equal(pixels.width, width);
    assert.equal(pixels.height, height);
    pixels.samples.forEach((sample, index) => sample.forEach((value, channel) => assert.ok(Math.abs(value - expectedColors[index][channel]) <= tolerance, `quadrant ${index}, channel ${channel}: ${value} expected ${expectedColors[index][channel]}`)));
}

await withBrowser(async (page) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(`${baseURL}/image/base64-encoder-decoder`);
    await page.locator('input[type="file"]').setInputFiles(file);
    const encoded = page.locator("textarea[readonly]");
    const dataUri = `data:image/png;base64,${fixture.toString("base64")}`;
    await page.waitForFunction((expected) => document.querySelector("textarea[readonly]")?.value === expected, dataUri);
    assert.equal(await encoded.inputValue(), dataUri, "Base64 encoding retains exact file bytes");
    await page.getByRole("tab", { name: "Base64 to Image", exact: true }).click();
    await page.locator("textarea:not([readonly])").fill(dataUri);
    const decoded = await download(page, "Download Decoded File");
    await inspectImage(page, decoded, "image/png", 96, 64, colors);

    await page.goto(`${baseURL}/image/convert-to-jpg-png`);
    await page.locator('input[type="file"]').setInputFiles(file);
    const jpeg = await download(page);
    await inspectImage(page, jpeg, "image/jpeg", 96, 64, colors, 8);
    assert.equal(await page.getByRole("progressbar").getAttribute("aria-valuenow"), "100", "conversion progress reaches completion");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.cvt-jpg-png__preview-image')?.alt === "Converted preview as PNG");
    const png = await download(page);
    await inspectImage(page, png, "image/png", 96, 64, colors);

    await page.goto(`${baseURL}/image/crop-resize`);
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.getByRole("button", { name: "1:1", exact: true }).click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    const cropped = await download(page);
    await inspectImage(page, cropped, "image/png", 64, 64, colors);

    await page.goto(`${baseURL}/image/crop-resize`);
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.getByRole("button", { name: "Resize", exact: true }).click();
    const dimensions = page.locator('input[type="number"]');
    await dimensions.nth(0).fill("48");
    await dimensions.nth(1).fill("32");
    await page.getByRole("button", { name: "Nearest", exact: true }).click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    const resized = await download(page);
    await inspectImage(page, resized, "image/png", 48, 32, colors);

    for (const [action, width, height, expected] of [
        ["90° CW", 64, 96, [colors[2], colors[0], colors[3], colors[1]]],
        ["Horizontal", 96, 64, [colors[1], colors[0], colors[3], colors[2]]],
        ["Vertical", 96, 64, [colors[2], colors[3], colors[0], colors[1]]],
    ]) {
        await page.goto(`${baseURL}/image/rotate-flip`);
        await page.locator('input[type="file"]').setInputFiles(file);
        await page.getByRole("button", { name: action, exact: true }).click();
        const rotated = await download(page);
        await inspectImage(page, rotated, "image/png", width, height, expected);
    }

    assert.deepEqual(pageErrors, []);
    console.log(`Image bytes, quadrant pixels, crop/resize, rotation/flips and conversion progress passed at ${page.viewportSize().width}px`);
});
