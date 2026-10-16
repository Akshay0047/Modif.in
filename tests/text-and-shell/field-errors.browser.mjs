import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const baseURL = process.env.TEST_BASE_URL || "http://localhost:4176";
const cases = [
    ["ascii-converter", "Decode", "ascii-converter-input", "not-a-number", "65"],
    ["binary-text", "Binary → Text", "binary-text-input", "102abc", "01000001"],
    ["hex-text", "Hex → Text", "hex-text-input", "not-hex!", "41"],
    ["base64-encoder-decoder", "Decode", "base64-encoder-decoder-input", "%", "SGVsbG8="],
    ["url-encoder-decoder", "Decode", "url-encoder-decoder-input", "%", "hello%20world"],
    ["roman-numeral-converter", "Number → Roman", "roman-input", "3.5", "4"],
    ["number-base-converter", "Binary", "number-base-input", "102", "10"],
    ["url-parser", null, "url-parser-input", "not a URL", "https://example.com/"],
    ["url-sanitizer", null, "url-sanitizer-input", "not a URL", "https://example.com/"],
    ["url-validator", null, "url-validator-input", "not a URL", "https://example.com/"],
    ["utm-builder-cleaner", "Build UTM URL", "utm-base-url", "not a URL", "https://example.com/"],
    ["utm-builder-cleaner", "Clean UTM params", "utm-clean-input", "not a URL", "https://example.com/?utm_source=x"],
    ["jwt-decoder", null, "jwt-decoder-input", "not-a-jwt", "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0."],
    ["query-string-tools", null, "query-generate-input", "{", "{}"],
    ["timestamp-converter", null, "date-input", "not-a-date", "2026-01-01T00:00:00.000Z"],
    ["regex-tester", null, "regex-pattern", "[", "[a-z]"],
    ["xml-tools", null, "xml-tools-input", "<root>", "<root/>"],
    ["find-replace", "Use regex", "find-replace-find", "[", "h"],
];

try {
    for (const width of [1440, 390]) {
        const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
        for (const [slug, button, id, invalid, valid] of cases) {
            await page.goto(`${baseURL}/text/${slug}`);
            await page.locator(".text-tool-page").waitFor();
            if (button) await page.getByRole("button", { name: button, exact: true }).click();
            const field = page.locator(`#${id}`);
            await field.fill(invalid);
            await page.waitForFunction((id) => document.getElementById(id)?.getAttribute("aria-invalid") === "true", id);
            const references = await field.evaluate((element) => (element.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent.trim()));
            assert.ok(references.length && references.every(Boolean), `${slug}: invalid input has no readable associated error`);
            assert.equal(await field.inputValue(), invalid, `${slug}: validation lost the entered value`);
            await field.fill(valid);
            await page.waitForFunction((id) => document.getElementById(id)?.getAttribute("aria-invalid") !== "true", id);
        }
        console.log(`${cases.length} associated error/recovery cases passed at ${width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
