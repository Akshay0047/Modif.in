import assert from "node:assert/strict";
import { withBrowser, baseURL, waitForPageReveal } from "./browserHarness.mjs";

await withBrowser(async (page, context) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
        const generate = crypto.getRandomValues.bind(crypto);
        window.generatorCalls = 0;
        crypto.getRandomValues = (bytes) => { window.generatorCalls += 1; return generate(bytes); };
    });
    const cases = [
        ["fake-data-generator", "#fake-data-count", 6],
        ["username-generator", "#username-count", 6],
        ["lorem-ipsum-generator", "#lorem-count", 51],
        ["password-generator", "#password-length", 17],
        ["token-generator", "#token-length", 33],
        ["uuid-id-generator", "#uuid-count", 2],
        ["test-data-generator", null, 7],
        ["random-generator", "#random-count", 6],
    ];
    for (const [slug, setting, expected] of cases) {
        await page.goto(`${baseURL}/text/${slug}`, { waitUntil: "domcontentloaded" });
        await waitForPageReveal(page);
        const output = page.locator("textarea[readonly]").first();
        await output.waitFor();
        const initial = await output.inputValue();
        assert.ok(initial.length > 0, `${slug} generates initially`);
        let calls = await page.evaluate(() => window.generatorCalls);
        assert.ok(calls > 0);

        await page.getByRole("button", { name: "Copy to Clipboard", exact: true }).click();
        await page.getByRole("button", { name: "Copied!", exact: true }).waitFor();
        assert.equal(await output.inputValue(), initial, `${slug} stays stable while copy status changes`);
        assert.equal(await page.evaluate(() => window.generatorCalls), calls);

        await page.getByRole("button", { name: "Regenerate", exact: true }).click();
        assert.ok(await page.evaluate(() => window.generatorCalls) > calls, `${slug} explicitly regenerates`);
        calls = await page.evaluate(() => window.generatorCalls);
        if (setting) await page.locator(setting).press("ArrowRight");
        else await page.getByRole("checkbox", { name: "ID", exact: true }).uncheck();
        assert.ok(await page.evaluate(() => window.generatorCalls) > calls, `${slug} regenerates on settings changes`);
        const changed = await output.inputValue();
        if (slug === "password-generator" || slug === "token-generator") assert.equal(changed.length, expected);
        else if (slug === "lorem-ipsum-generator") assert.equal(changed.split(" ").length, expected);
        else assert.equal(changed.split("\n").length, expected);
    }
    await page.goto(`${baseURL}/text/token-generator`);
    await waitForPageReveal(page);
    const token = page.getByRole("textbox", { name: "Generated token", exact: true });
    const length = page.locator("#token-length");
    await token.waitFor();
    for (const [mode, pattern, expectedLengths] of [
        ["Hex tokens", /^[0-9a-f]+$/, [32, 34, 128, 16, 16]],
        ["API-style tokens", /^[A-Za-z0-9_-]+$/, [32, 33, 128, 8, 9]],
        ["Random strings", /^[A-Za-z0-9]+$/, [32, 33, 128, 8, 9]],
    ]) {
        // A fresh route restores the default length before each mode sweep.
        await page.goto(`${baseURL}/text/token-generator`);
        await waitForPageReveal(page);
        await page.getByRole("button", { name: mode, exact: true }).click();
        for (const [index, key] of [null, "ArrowRight", "End", "Home", "ArrowRight"].entries()) {
            if (key) await length.press(key);
            const value = await token.inputValue();
            assert.match(value, pattern, `${mode} uses its intended character set`);
            assert.equal(value.length, expectedLengths[index], `${mode} preserves default, odd, maximum and minimum length semantics`);
        }
    }
    console.log("Eight generators preserve initial, setting-change, explicit-regeneration and stable-copy behavior.");
});
