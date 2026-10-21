import assert from "node:assert/strict";
import { chromium } from "playwright";
import { getIndexableRoutes, getRouteMeta } from "../../src/data/routeMeta.js";
import { getRouteStructuredData } from "../../src/data/routeStructuredData.js";
import { baseURL, waitForPageReveal } from "./browserHarness.mjs";

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
try {
    // Social previews and crawlers must receive complete metadata without JS.
    const crawler = await browser.newContext({ javaScriptEnabled: false });
    const page = await crawler.newPage();
    for (const meta of getIndexableRoutes()) {
        const response = await page.goto(baseURL + meta.path, { waitUntil: "domcontentloaded" });
        assert.equal(response.status(), 200, meta.path);
        assert.equal(await page.title(), meta.title);
        assert.equal(await page.locator('meta[name="description"]').getAttribute("content"), meta.description);
        assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), meta.canonical);
        assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), meta.canonical);
        assert.deepEqual(JSON.parse(await page.locator("#route-structured-data").textContent()), getRouteStructuredData(meta));
    }
    const missing = await page.goto(baseURL + "/missing-page");
    assert.equal(missing.status(), 404);
    assert.equal(await page.title(), getRouteMeta("/missing-page").title);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex");
    assert.equal(await page.locator('link[rel="canonical"], meta[property="og:url"], #route-structured-data').count(), 0);
    assert.equal((await crawler.request.get(baseURL + "/sitemap.xml")).status(), 200);
    assert.equal((await crawler.request.get(baseURL + "/robots.txt")).status(), 200);
    await crawler.close();

    const context = await browser.newContext({ reducedMotion: "reduce" });
    const app = await context.newPage();
    await app.goto(baseURL + "/missing-page");
    await app.getByRole("navigation", { name: "Page recovery" }).getByRole("link", { name: "Text tools", exact: true }).click();
    await waitForPageReveal(app);
    assert.equal(await app.title(), getRouteMeta("/text").title);
    assert.equal(await app.locator('link[rel="canonical"]').count(), 1);
    assert.equal(await app.locator('meta[name="robots"]').getAttribute("content"), "index,follow");
    assert.deepEqual(JSON.parse(await app.locator("#route-structured-data").textContent()), getRouteStructuredData(getRouteMeta("/text")));
    await app.goBack();
    await app.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === "noindex");
    assert.equal(await app.locator('link[rel="canonical"], #route-structured-data').count(), 0);
    await context.close();
    console.log("All 118 static route heads, real 404s, public crawler files, and client metadata transitions passed.");
} finally {
    await browser.close();
}
