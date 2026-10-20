import assert from "node:assert/strict";
import { textToolsData } from "../../src/data/textTools.js";
import { imageToolsData } from "../../src/data/imageTools.js";
import { docToolsData } from "../../src/data/docTools.js";
import { baseURL, withBrowser } from "./browserHarness.mjs";

const routes = [
    ["/", "MODIF.in | Text, image and document tools"],
    ["/text", "Text tools | MODIF.in"],
    ["/image", "Image tools | MODIF.in"],
    ["/doc", "Document tools | MODIF.in"],
    ["/missing", "Page not found | MODIF.in"],
    ...[...textToolsData, ...imageToolsData, ...docToolsData].flatMap((category) => category.tools.map((tool) => [tool.path, `${tool.name} | MODIF.in`])),
];

await withBrowser(async (page) => {
    for (const [path, title] of routes) {
        await page.goto(baseURL + path, { waitUntil: "domcontentloaded" });
        await page.waitForFunction((expected) => document.title === expected, title);
        assert.equal(await page.title(), title);
    }
    await page.goto(baseURL + "/missing");
    await page.getByRole("navigation", { name: "Page recovery" }).getByRole("link", { name: "Text tools", exact: true }).click();
    await page.waitForFunction(() => document.title === "Text tools | MODIF.in");
    await page.goBack();
    await page.waitForFunction(() => document.title === "Page not found | MODIF.in");
    await page.goForward();
    await page.waitForFunction(() => document.title === "Text tools | MODIF.in");
    console.log(`${routes.length} direct route titles and client/history updates passed at ${page.viewportSize().width}px`);
});
