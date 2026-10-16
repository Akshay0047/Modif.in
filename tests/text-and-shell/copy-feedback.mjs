import assert from "node:assert/strict";
import { baseURL, withBrowser } from "./browserHarness.mjs";

await withBrowser(async (page, context) => {
    await context.addInitScript(() => {
        window.copyDenied = true;
        Object.defineProperty(navigator, "clipboard", { value: {
            writeText: async (text) => {
                if (window.copyDenied) throw new DOMException("Denied", "NotAllowedError");
                window.copiedText = text;
            },
        } });
    });

    for (const route of ["/text/case-converter", "/doc/csv-converter", "/doc/table-to-markdown"]) {
        await page.goto(baseURL + route);
        if (route.startsWith("/text")) {
            await page.locator("#case-converter-input").fill("Hello, 😀 world\nSecond line");
        } else {
            await page.locator('input[type="file"]').setInputFiles({ name: "fixture.csv", mimeType: "text/csv", buffer: Buffer.from("name,value\nhello,42") });
            if (route === "/doc/csv-converter") await page.getByRole("button", { name: "Convert", exact: true }).click();
        }
        const output = page.locator("textarea[readonly]").first();
        await output.waitFor();
        const expected = await output.inputValue();
        const copy = page.getByRole("button", { name: "Copy to Clipboard", exact: true });
        await copy.click();
        const manual = page.getByRole("textbox", { name: "Text for manual copy" });
        await manual.waitFor();
        assert.match(await page.locator(".copy-control [role=status]").textContent(), /Copy failed/);
        assert.equal(await manual.inputValue(), expected);
        assert.equal(await output.inputValue(), expected);
        assert.equal(await page.getByRole("button", { name: "Copied!", exact: true }).count(), 0);
        await page.getByRole("button", { name: "Select text", exact: true }).click();
        assert.equal(await manual.evaluate((element) => element.selectionEnd - element.selectionStart), expected.length);
        await page.evaluate(() => { window.copyDenied = false; });
        await copy.click();
        await page.getByRole("button", { name: "Copied!", exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.copiedText), expected);
        assert.equal(await manual.count(), 0);
        if (route.startsWith("/text")) {
            await page.locator("#case-converter-input").fill("Changed output");
            assert.equal(await page.getByRole("button", { name: "Copied!", exact: true }).count(), 0);
        }
    }
    for (const route of ["ocr", "text-extractor", "table-extractor"]) {
        await page.goto(`${baseURL}/doc/${route}`);
        await page.locator("h1").waitFor();
        assert.equal(await page.locator('input[type="file"]').count(), 1);
    }
    console.log(`Copy failure, manual selection, success, stale reset and docs consumers passed at ${page.viewportSize().width}px`);
});
