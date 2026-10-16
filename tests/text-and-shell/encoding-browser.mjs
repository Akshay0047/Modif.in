import assert from "node:assert/strict";

// Use an existing Playwright installation without adding browser tooling to app dependencies.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const baseURL = process.env.TEST_BASE_URL || "http://localhost:4176";

try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${baseURL}/text/morse-code-converter`);
        await page.getByRole("button", { name: "Morse → Text", exact: true }).click();
        await page.locator("textarea:not([readonly])").fill(".... . .-.. .-.. --- / .-- --- .-. .-.. -..");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "HELLO WORLD");
        assert.equal(await page.locator("textarea[readonly]").inputValue(), "HELLO WORLD");
        await page.locator("textarea:not([readonly])").fill("... --- .../... --- ...");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "SOS SOS");
        for (const [slug, decode, encoded] of [
            ["binary-text", "Binary → Text", "11110000 10011111 10001100 10001101"],
            ["hex-text", "Hex → Text", "F0 9F 8C 8D"],
        ]) {
            await page.goto(`${baseURL}/text/${slug}`);
            await page.locator("textarea:not([readonly])").fill("🌍");
            await page.waitForFunction((expected) => document.querySelector("textarea[readonly]")?.value === expected, encoded);
            await page.getByRole("button", { name: decode, exact: true }).click();
            await page.locator("textarea:not([readonly])").fill(encoded);
            await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "🌍");
            await page.locator("textarea:not([readonly])").fill("");
            await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "");
        }
        assert.deepEqual(errors, []);
        console.log(`Morse and UTF-8 production UI passed at ${viewport.width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
