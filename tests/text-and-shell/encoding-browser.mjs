import assert from "node:assert/strict";
import { waitForPageReveal } from "./browserHarness.mjs";

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
        await waitForPageReveal(page);
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
            await waitForPageReveal(page);
            await page.locator("textarea:not([readonly])").fill("🌍");
            await page.waitForFunction((expected) => document.querySelector("textarea[readonly]")?.value === expected, encoded);
            await page.getByRole("button", { name: decode, exact: true }).click();
            await page.locator("textarea:not([readonly])").fill(encoded);
            await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "🌍");
            await page.locator("textarea:not([readonly])").fill("");
            await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "");
        }
        for (const [slug, decode, invalid, valid, expected] of [
            ["binary-text", "Binary → Text", "102abc", "01000001", "A"],
            ["hex-text", "Hex → Text", "not-hex!", "41", "A"],
            ["ascii-converter", "Decode", "not-a-number", "65", "A"],
        ]) {
            await page.goto(`${baseURL}/text/${slug}`);
            await waitForPageReveal(page);
            await page.getByRole("button", { name: decode, exact: true }).click();
            const input = page.locator("textarea:not([readonly])");
            await input.fill(invalid);
            await page.getByRole("alert").waitFor();
            assert.equal(await input.getAttribute("aria-invalid"), "true");
            assert.equal(await input.getAttribute("aria-describedby"), `${slug}-error`);
            assert.equal(await page.getByRole("button", { name: "Copy to Clipboard", exact: true }).isDisabled(), true);
            assert.equal(await page.locator("textarea[readonly]").inputValue(), "");
            await input.fill(valid);
            await page.waitForFunction((text) => document.querySelector("textarea[readonly]")?.value === text, expected);
            assert.equal(await page.getByRole("alert").count(), 0);
            assert.equal(await input.getAttribute("aria-invalid"), "false");
        }
        await page.goto(`${baseURL}/text/roman-numeral-converter`);
        await waitForPageReveal(page);
        await page.locator("#roman-input").fill("3.5");
        await page.getByRole("alert").waitFor();
        assert.equal(await page.locator("#roman-input").getAttribute("aria-describedby"), "roman-error");
        assert.equal(await page.locator("textarea[readonly]").inputValue(), "");
        await page.getByRole("button", { name: "Roman → Number", exact: true }).click();
        await page.locator("#roman-input").fill("IIII");
        assert.equal(await page.locator("#roman-input").getAttribute("aria-invalid"), "true");
        await page.locator("#roman-input").fill("IV");
        await page.waitForFunction(() => document.querySelector("textarea[readonly]")?.value === "4");
        await page.goto(`${baseURL}/text/number-base-converter`);
        await waitForPageReveal(page);
        await page.getByRole("button", { name: "Binary", exact: true }).click();
        await page.locator("#number-base-input").fill("102");
        await page.getByRole("alert").waitFor();
        assert.equal(await page.locator("#number-base-input").getAttribute("aria-describedby"), "number-base-error");
        assert.equal(await page.getByRole("button", { name: "Copy to Clipboard", exact: true }).count(), 4);
        assert.equal(await page.locator(".text-tool-result-card button:disabled").count(), 4);
        await page.locator("#number-base-input").fill("101010");
        await page.waitForFunction(() => [...document.querySelectorAll(".text-tool-result-card__value")].some((el) => el.textContent === "2A"));
        assert.equal(await page.getByRole("alert").count(), 0);
        await page.getByRole("button", { name: "Decimal", exact: true }).click();
        await page.locator("#number-base-input").fill("9007199254740993");
        await page.waitForFunction(() => [...document.querySelectorAll(".text-tool-result-card__value")].some((el) => el.textContent === "20000000000001"));
        await page.getByRole("button", { name: "Hexadecimal", exact: true }).click();
        await page.locator("#number-base-input").fill("20000000000001");
        await page.waitForFunction(() => [...document.querySelectorAll(".text-tool-result-card__value")].some((el) => el.textContent === "9007199254740993"));
        assert.deepEqual(errors, []);
        console.log(`Encoding production UI and error recovery passed at ${viewport.width}px`);
        await page.close();
    }
} finally {
    await browser.close();
}
