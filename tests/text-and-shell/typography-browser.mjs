import assert from "node:assert/strict";
import { waitForPageReveal } from "./browserHarness.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const baseURL = process.env.TEST_BASE_URL || "http://localhost:4176";

try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`${baseURL}/text/text-reverser`);
        await waitForPageReveal(page);
        await page.locator("#text-reverser-input").fill("a👨‍👩‍👧‍👦b");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "b👨‍👩‍👧‍👦a");
        await page.getByRole("button", { name: "Reverse characters", exact: true }).click();
        await page.locator("#text-reverser-input").fill("ae\u0301🇮🇳👍🏽b");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "b👍🏽🇮🇳e\u0301a");
        await page.goto(`${baseURL}/text/find-replace`);
        await waitForPageReveal(page);
        await page.locator("#find-replace-input").fill("hello");
        await page.locator("#find-replace-find").fill("[");
        await page.locator("#find-replace-replace").fill("x");
        await page.getByRole("button", { name: "Use regex", exact: true }).click();
        await page.getByRole("alert").waitFor();
        assert.equal(await page.locator("#find-replace-find").getAttribute("aria-describedby"), "find-replace-error");
        assert.equal(await page.locator("#find-replace-find").getAttribute("aria-invalid"), "true");
        assert.equal(await page.locator("textarea[readonly]").inputValue(), "");
        assert.equal(await page.getByRole("button", { name: "Copy to Clipboard", exact: true }).isDisabled(), true);
        await page.locator("#find-replace-find").fill("h");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "xello");
        assert.equal(await page.getByRole("alert").count(), 0);
        await page.getByRole("button", { name: "Multiple patterns", exact: true }).click();
        await page.locator("#find-replace-patterns").fill("hello|world\n\n[|x");
        await page.getByRole("alert").waitFor();
        assert.match(await page.getByRole("alert").textContent(), /line 3/);
        assert.match(await page.locator("#find-replace-patterns").getAttribute("aria-describedby"), /\bfind-replace-error\b/);
        assert.equal(await page.locator("textarea[readonly]").inputValue(), "");
        await page.locator("#find-replace-patterns").fill("hello|world");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "world");
        await page.goto(`${baseURL}/text/case-converter`);
        await waitForPageReveal(page);
        await page.locator("#case-converter-input").fill("élan über déjà");
        await page.getByRole("button", { name: "Title Case", exact: true }).click();
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "Élan Über Déjà");
        await page.locator("#case-converter-input").fill("e\u0301LAN — ПРИВЕТ" );
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "E\u0301lan — Привет");
        await page.goto(`${baseURL}/text/fancy-text-converter`);
        await waitForPageReveal(page);
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.locator("#fancy-text-converter-input").fill("h Hello");
        const italic = page.locator(".text-tool-result-card").filter({ hasText: "Italic-style Unicode" });
        await italic.waitFor();
        assert.equal(await italic.locator(".text-tool-result-card__value").textContent(), "ℎ 𝐻𝑒𝑙𝑙𝑜");
        await italic.getByRole("button", { name: "Copy to Clipboard", exact: true }).click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "ℎ 𝐻𝑒𝑙𝑙𝑜");
        assert.deepEqual(errors, []);
        console.log(`Typography production UI passed at ${viewport.width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
