import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { baseURL, withBrowser, waitForPageReveal } from "./browserHarness.mjs";

await withBrowser(async (page, context) => {
    await context.addInitScript(() => {
        const sign = crypto.subtle.sign.bind(crypto.subtle);
        window.hmacWaiters = [];
        crypto.subtle.sign = async (...args) => {
            if (window.failHmac) throw new DOMException("Synthetic provider failure", "OperationError");
            const output = await sign(...args);
            if (window.holdHmac) await new Promise((resolve) => window.hmacWaiters.push(resolve));
            return output;
        };
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseURL + "/text/hmac-generator");
    await waitForPageReveal(page);
    const message = page.getByLabel("Message", { exact: true });
    const secret = page.getByLabel("Secret key", { exact: true });
    const output = page.getByRole("textbox", { name: "HMAC signature", exact: true });
    const copy = page.getByRole("button", { name: "Copy to Clipboard", exact: true });
    await output.waitFor();
    assert.equal(await copy.isDisabled(), true);
    await message.fill("hello");
    await secret.fill("synthetic key");
    for (const [button, algorithm] of [["SHA-256", "sha256"], ["SHA-1", "sha1"], ["SHA-512", "sha512"]]) {
        await page.getByRole("button", { name: button, exact: true }).click();
        const expected = createHmac(algorithm, "synthetic key").update("hello").digest("hex");
        await page.waitForFunction((expected) => document.querySelector('textarea[readonly]')?.value === expected, expected);
    }
    await secret.fill("");
    assert.equal(await output.inputValue(), "");
    assert.equal(await copy.isDisabled(), true);
    await secret.fill("synthetic key");
    await page.evaluate(() => { window.holdHmac = true; });
    await message.fill("obsolete input");
    await page.waitForFunction(() => window.hmacWaiters.length > 0);
    await message.fill("current input");
    await page.waitForFunction(() => window.hmacWaiters.length > 1);
    assert.equal(await output.inputValue(), "");
    assert.equal(await copy.isDisabled(), true);
    await page.evaluate(() => { window.holdHmac = false; window.hmacWaiters.splice(0).forEach((resolve) => resolve()); });
    const expected = createHmac("sha512", "synthetic key").update("current input").digest("hex");
    await page.waitForFunction((expected) => document.querySelector('textarea[readonly]')?.value === expected, expected);
    await page.evaluate(() => { window.failHmac = true; });
    await message.fill("provider fails");
    await page.getByRole("alert").filter({ hasText: "Synthetic provider failure" }).waitFor();
    assert.equal(await message.getAttribute("aria-invalid"), "true");
    assert.equal(await copy.isDisabled(), true);
    await page.evaluate(() => { window.failHmac = false; });
    await message.fill("hello");
    await output.waitFor();
    await page.waitForFunction((expected) => document.querySelector('textarea[readonly]')?.value === expected, createHmac("sha512", "synthetic key").update("hello").digest("hex"));
    assert.deepEqual(errors, []);
    console.log(`HMAC vectors, clear, stale-result suppression and error recovery passed at ${page.viewportSize().width}px`);
});
