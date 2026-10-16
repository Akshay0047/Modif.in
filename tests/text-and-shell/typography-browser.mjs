import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const baseURL = process.env.TEST_BASE_URL || "http://localhost:4176";

try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${baseURL}/text/text-reverser`);
        await page.locator("#text-reverser-input").fill("a👨‍👩‍👧‍👦b");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "b👨‍👩‍👧‍👦a");
        await page.getByRole("button", { name: "Reverse characters", exact: true }).click();
        await page.locator("#text-reverser-input").fill("ae\u0301🇮🇳👍🏽b");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "b👍🏽🇮🇳e\u0301a");
        assert.deepEqual(errors, []);
        console.log(`Typography production UI passed at ${viewport.width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
