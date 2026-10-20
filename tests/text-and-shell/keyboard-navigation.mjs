import assert from "node:assert/strict";
import { baseURL, withBrowser, waitForPageReveal } from "./browserHarness.mjs";

await withBrowser(async (page) => {
    for (const [route, selector, value] of [
        ["text-counter", "textarea:not([readonly])", "Hello world."],
        ["roman-numeral-converter", "input", "2026"],
        ["url-parser", "textarea:not([readonly])", "https://example.com/a?q=hello#part"],
        ["hmac-generator", 'input[type="password"]', "synthetic secret"],
        ["ascii-kaomoji", "#ascii-kaomoji-search", "happy"],
    ]) {
        await page.goto(`${baseURL}/text/${route}`);
        await waitForPageReveal(page);
        const field = page.locator(selector).first();
        await field.fill(value);
        await field.press("Tab");
        assert.equal(await field.inputValue(), value, `${route}: Tab preserves content`);
        assert.equal(await field.evaluate((element) => element === document.activeElement), false, `${route}: Tab moves focus`);
        await field.focus();
        await field.press("Shift+Tab");
        assert.equal(await field.inputValue(), value, `${route}: Shift+Tab preserves content`);
        assert.equal(await field.evaluate((element) => element === document.activeElement), false, `${route}: Shift+Tab moves focus`);
    }
    console.log(`Keyboard navigation passed at ${page.viewportSize().width}px`);
});
