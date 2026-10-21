import assert from "node:assert/strict";
import { textToolsData } from "../../src/data/textTools.js";
import { imageToolsData } from "../../src/data/imageTools.js";
import { docToolsData } from "../../src/data/docTools.js";
import { getRouteTitle } from "../../src/data/routeTitles.js";
import { baseURL, withBrowser } from "./browserHarness.mjs";

const routes = [
    "/",
    "/text",
    "/image",
    "/doc",
    "/missing",
    ...[...textToolsData, ...imageToolsData, ...docToolsData].flatMap((category) => category.tools.map((tool) => tool.path)),
].map((path) => [path, getRouteTitle(path)]);

await withBrowser(async (page) => {
    for (const [path, title] of routes) {
        await page.goto(baseURL + path, { waitUntil: "domcontentloaded" });
        await page.waitForFunction((expected) => document.title === expected, title);
        assert.equal(await page.title(), title);
    }
    await page.goto(baseURL + "/missing");
    await page.getByRole("navigation", { name: "Page recovery" }).getByRole("link", { name: "Text tools", exact: true }).click();
    await page.waitForFunction((title) => document.title === title, getRouteTitle("/text"));
    await page.goBack();
    await page.waitForFunction((title) => document.title === title, getRouteTitle("/missing"));
    await page.goForward();
    await page.waitForFunction((title) => document.title === title, getRouteTitle("/text"));
    console.log(`${routes.length} direct route titles and client/history updates passed at ${page.viewportSize().width}px`);
});
