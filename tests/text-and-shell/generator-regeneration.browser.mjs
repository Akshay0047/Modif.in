import assert from "node:assert/strict";
import { withBrowser, baseURL } from "./browserHarness.mjs";

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
    ];
    for (const [slug, setting, expected] of cases) {
        await page.goto(`${baseURL}/text/${slug}`, { waitUntil: "domcontentloaded" });
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
    console.log("Seven generators preserve initial, setting-change, explicit-regeneration and stable-copy behavior.");
});
