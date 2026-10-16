import assert from "node:assert/strict";
import { baseURL, withBrowser } from "./browserHarness.mjs";

await withBrowser(async (page) => {
    for (const route of ["/qa-route-does-not-exist", "/text/missing-tool", "/image/missing-tool", "/doc/missing-tool"]) {
        await page.goto(baseURL + route);
        await page.getByRole("heading", { name: "Page not found", level: 1 }).waitFor();
        const recovery = page.getByRole("navigation", { name: "Page recovery" });
        assert.deepEqual(await recovery.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))), ["/", "/text", "/image", "/doc"]);
        await recovery.getByRole("link", { name: "Text tools", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.waitForURL(baseURL + "/text");
        await page.getByRole("searchbox", { name: "Search tools" }).waitFor();
        await page.goBack();
        await page.getByRole("heading", { name: "Page not found", level: 1 }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    }
    if (process.env.MODIF_SCREENSHOTS) await page.screenshot({ path: `${process.env.MODIF_SCREENSHOTS}/not-found-${page.viewportSize().width}.png`, fullPage: true });
    console.log(`404 recovery passed at ${page.viewportSize().width}px`);
});
