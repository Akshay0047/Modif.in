import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href : "playwright");
const baseURL = process.env.MODIF_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true, args: ["--disable-gpu"] });
const routes = ["random-generator", "fake-data-generator", "username-generator", "lorem-ipsum-generator", "test-data-generator", "uuid-id-generator", "password-generator", "token-generator"];

try {
    for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 844 } });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        for (const route of routes) {
            await page.goto(`${baseURL}/text/${route}`, { waitUntil: "domcontentloaded" });
            const output = page.locator("textarea[readonly]").first();
            await output.waitFor();
            assert.ok((await output.inputValue()).length > 0, `${route} starts with generated output`);
            await page.evaluate(() => {
                window.originalGeneratorCrypto = crypto.getRandomValues;
                crypto.getRandomValues = () => { throw new Error("Synthetic crypto failure"); };
            });
            await page.getByRole("button", { name: "Regenerate", exact: true }).click();
            await page.getByRole("alert").filter({ hasText: "Synthetic crypto failure" }).waitFor();
            assert.equal(await output.inputValue(), "");
            assert.equal(await page.getByRole("button", { name: "Copy to Clipboard", exact: true }).isDisabled(), true);
            await page.evaluate(() => { crypto.getRandomValues = window.originalGeneratorCrypto; });
            await page.getByRole("button", { name: "Regenerate", exact: true }).click();
            assert.ok((await output.inputValue()).length > 0, `${route} recovers after crypto restoration`);
            assert.equal(await page.getByRole("alert").count(), 0);
            await page.evaluate(() => { crypto.getRandomValues = undefined; });
            await page.getByRole("button", { name: "Regenerate", exact: true }).click();
            await page.getByRole("alert").waitFor();
            assert.equal(await output.inputValue(), "", `${route} stays usable when Web Crypto is unavailable`);
            await page.evaluate(() => { crypto.getRandomValues = window.originalGeneratorCrypto; });
            await page.getByRole("button", { name: "Regenerate", exact: true }).click();
            assert.ok((await output.inputValue()).length > 0);
        }

        await page.goto(`${baseURL}/text/random-generator`, { waitUntil: "domcontentloaded" });
        await page.getByRole("button", { name: "Random numbers", exact: true }).click();
        const minimum = page.locator("#random-min"), maximum = page.locator("#random-max");
        const output = page.locator("textarea[readonly]").first();
        await minimum.fill("1001");
        await page.getByRole("alert").filter({ hasText: "safe-integer range" }).waitFor();
        assert.equal(await output.inputValue(), "");
        assert.equal(await minimum.inputValue(), "1001", "invalid settings stay editable");
        await minimum.fill("1");
        assert.equal((await output.inputValue()).split("\n").length, 5);
        await minimum.fill("0.1");
        await maximum.fill("0.9");
        await page.getByRole("alert").filter({ hasText: "safe-integer range" }).waitFor();
        assert.equal(await output.inputValue(), "");
        await maximum.fill("1.9");
        assert.equal(await output.inputValue(), "1\n1\n1\n1\n1", "valid rounded integer bounds recover immediately");
        assert.equal(await page.getByRole("alert").count(), 0);
        assert.deepEqual(errors, [], "settings and crypto failures never escape into the route boundary");
        await context.close();
        console.log(`Eight generators passed crypto failure/recovery and random-number invalid-range recovery at ${width}px`);
    }
} finally {
    await browser.close();
}
