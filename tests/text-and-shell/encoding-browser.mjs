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
        assert.deepEqual(errors, []);
        console.log(`Morse production UI passed at ${viewport.width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
