import assert from "node:assert/strict";
import { baseURL, waitForPageReveal, withBrowser } from "./browserHarness.mjs";

await withBrowser(async (page, context) => {
    const external = [];
    await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (/^https?:$/.test(url.protocol) && url.origin !== new URL(baseURL).origin) {
            external.push(url.href);
            await route.abort();
        } else {
            await route.continue();
        }
    });
    await page.goto(`${baseURL}/text/markdown-tools`);
    await waitForPageReveal(page);
    const sameOriginRequests = [];
    page.on("request", (request) => {
        if (request.url().includes("privacy-probe")) sameOriginRequests.push(request.url());
    });
    await page.locator("#markdown-tools-input").fill("# Private preview\n\n![tracking pixel](https://privacy-probe.invalid/pixel?secret=private)\n\n![relative pixel](/privacy-probe?secret=private)");
    await page.getByText("External image blocked for privacy: tracking pixel", { exact: true }).waitFor();
    await page.getByText("External image blocked for privacy: relative pixel", { exact: true }).waitFor();
    assert.equal(await page.locator(".text-tool-preview-box img").count(), 0);
    assert.equal(await page.locator("#main-content h1").count(), 1);
    await page.waitForTimeout(1200);
    assert.deepEqual(external, [], "page and pasted Markdown must not request third-party resources");
    assert.deepEqual(sameOriginRequests, [], "relative Markdown images must not send entered URLs to the host");
    assert.equal(await page.evaluate(() => "gtag" in window || "dataLayer" in window), false);
});

console.log("Privacy browser checks passed at desktop and mobile widths.");
