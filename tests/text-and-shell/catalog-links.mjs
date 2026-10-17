import assert from "node:assert/strict";
import { baseURL, withBrowser } from "./browserHarness.mjs";

await withBrowser(async (page, context) => {
    for (const hub of ["text", "image", "doc"]) {
        await page.goto(`${baseURL}/${hub}`);
        const links = page.locator("a.tool-button");
        await links.first().waitFor();
        assert.equal(await page.locator("button.tool-button").count(), 0);
        const hrefs = await links.evaluateAll((elements) => elements.map((link) => link.getAttribute("href")));
        assert.ok(hrefs.every((href) => href.startsWith(`/${hub}/`)));
        for (const selector of ["a.tool-button.highlighted", "a.tool-button:not(.highlighted)"]) {
            const link = page.locator(selector).first();
            const href = await link.getAttribute("href");
            await link.focus();
            await link.press("Enter");
            await page.waitForURL(baseURL + href);
            await page.goBack();
            const newTabPromise = context.waitForEvent("page");
            await page.locator(selector).first().click({ modifiers: ["Control"] });
            const newTab = await newTabPromise;
            await newTab.waitForURL(baseURL + href);
            assert.equal(page.url(), `${baseURL}/${hub}`);
            await newTab.close();
            const middleTabPromise = context.waitForEvent("page");
            await page.locator(selector).first().click({ button: "middle" });
            const middleTab = await middleTabPromise;
            await middleTab.waitForURL(baseURL + href);
            await middleTab.close();
        }
    }
    console.log(`Real hrefs, keyboard, Ctrl-click and middle-click passed in three hubs at ${page.viewportSize().width}px`);
});
