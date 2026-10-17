import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { textToolsData } from "../../src/data/textTools.js";
import { imageToolsData } from "../../src/data/imageTools.js";
import { docToolsData } from "../../src/data/docTools.js";
import { getRouteTitle } from "../../src/data/routeTitles.js";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href : "playwright");
const baseURL = process.env.MODIF_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true, args: ["--disable-gpu"] });
const toolPaths = [...textToolsData, ...imageToolsData, ...docToolsData].flatMap((category) => category.tools.map((tool) => tool.path));
const paths = ["/", "/text", "/image", "/doc", ...toolPaths, "/route-loading-missing"];

async function ready(page, path) {
    const selector = path === "/" ? ".hero-editor-cards" : path === "/route-loading-missing" ? ".not-found-page h1" :
        ["/text", "/image", "/doc"].includes(path) ? "a.tool-button" :
        path.startsWith("/text/") ? ".text-tool-page h1" : path.startsWith("/doc/") ? ".doc-tool-page h1" : ".image-tool-page h1";
    await page.locator(selector).first().waitFor({ timeout: 20000 });
    assert.equal(await page.locator(".route-feedback").count(), 0, `${path} rendered actual content`);
    assert.equal(await page.title(), getRouteTitle(path));
}

try {
    // Every direct route must mount its workspace; a title alone can update
    // before its import resolves and would miss lazy-load/render failures.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(`${new URL(page.url()).pathname}: ${error.message}`));
    for (const path of paths) {
        await page.goto(baseURL + path, { waitUntil: "domcontentloaded" });
        await ready(page, path);
    }
    assert.deepEqual(errors, []);
    console.log(`${paths.length} direct routes mounted real content with correct titles and no uncaught page errors`);
    await context.close();

    // Measure fresh contexts, excluding unrelated analytics requests. The local
    // preview serves identity encoding; decoded bytes make this reproducible.
    for (const path of ["/", "/text/text-counter"]) {
        const coldContext = await browser.newContext({ reducedMotion: "reduce" });
        const cold = await coldContext.newPage();
        await cold.goto(baseURL + path, { waitUntil: "domcontentloaded" });
        await ready(cold, path);
        const scripts = await cold.evaluate(() => performance.getEntriesByType("resource")
            .filter((entry) => entry.name.startsWith(location.origin) && /\.m?js(?:\?|$)/.test(entry.name))
            .map(({ name, decodedBodySize }) => ({ name: new URL(name).pathname, bytes: decodedBodySize })));
        assert.ok(scripts.length > 0 && scripts.every(({ bytes }) => bytes > 0));
        assert.ok(scripts.every(({ name }) => !/pdfUtils-|pdf\.worker|csvUtils-|heic2any-|jszip|to-pdf-|ebook-conversion-|imageToolUtils-/.test(name)), "cold entry does not request document/image processing chunks");
        const bytes = scripts.reduce((total, script) => total + script.bytes, 0);
        assert.ok(bytes < 2_000_000, "cold entry stays well below the former 4.6 MB entry bundle");
        console.log(JSON.stringify({ coldRoute: path, decodedJavaScriptBytes: bytes, scripts }));
        await coldContext.close();
    }

    // Hold a real tool chunk at the network boundary and then release it.
    const delayedContext = await browser.newContext({ reducedMotion: "reduce" });
    const delayed = await delayedContext.newPage();
    let releaseChunk;
    const gate = new Promise((resolve) => { releaseChunk = resolve; });
    await delayed.route(/\/assets\/text-counter-[^/]+\.js$/, async (route) => { await gate; await route.continue(); });
    await delayed.goto(baseURL + "/text/text-counter", { waitUntil: "domcontentloaded" });
    await delayed.getByRole("status").filter({ has: delayed.getByRole("heading", { name: "Loading page…" }) }).waitFor();
    assert.equal(await delayed.getByRole("navigation", { name: "Loading recovery" }).getByRole("link").count(), 4);
    releaseChunk();
    await ready(delayed, "/text/text-counter");
    await delayedContext.close();

    // A failed module import is cached by React.lazy. Recovery therefore offers
    // a real document reload plus navigation to a fresh hub boundary.
    const failedContext = await browser.newContext({ reducedMotion: "reduce" });
    const failed = await failedContext.newPage();
    const chunkPattern = /\/assets\/text-counter-[^/]+\.js$/;
    await failed.route(chunkPattern, (route) => route.abort("failed"));
    await failed.goto(baseURL + "/text/text-counter", { waitUntil: "domcontentloaded" });
    await failed.getByRole("heading", { name: "This page could not load", exact: true }).waitFor();
    assert.equal(await failed.title(), "Page could not load | MODIF.in");
    await failed.getByRole("navigation", { name: "Loading recovery" }).getByRole("link", { name: "Text tools", exact: true }).click();
    await ready(failed, "/text");
    await failed.locator('a.tool-button[href="/text/text-counter"]').first().click();
    await failed.getByRole("heading", { name: "This page could not load", exact: true }).waitFor();
    await failed.unroute(chunkPattern);
    await failed.getByRole("button", { name: "Reload page", exact: true }).click();
    await ready(failed, "/text/text-counter");

    // Already-loaded workspaces and hub chunks remain navigable without a
    // network connection. Use actual links and browser history, not direct loads.
    await failed.goto(baseURL + "/text");
    await ready(failed, "/text");
    await failed.locator('a.tool-button[href="/text/text-counter"]').first().click();
    await ready(failed, "/text/text-counter");
    await failedContext.setOffline(true);
    await failed.goBack();
    await ready(failed, "/text");
    await failed.locator('a.tool-button[href="/text/text-counter"]').first().click();
    await ready(failed, "/text/text-counter");
    const input = failed.locator("textarea:not([readonly])").first();
    await input.fill("Offline text remains local.");
    assert.equal(await input.inputValue(), "Offline text remains local.");
    await failedContext.setOffline(false);
    await failedContext.close();
    console.log("Delayed loading, failed import, hub recovery, reload recovery and offline repeat navigation passed");
} finally {
    await browser.close();
}
