import assert from "node:assert/strict";
import { baseURL, withBrowser, waitForPageReveal } from "./browserHarness.mjs";

const animationChunk = /\/(?:assets\/AnimatedList-[^/]+\.js|src\/components\/AnimatedList\.jsx)(?:\?.*)?$/;

await withBrowser(async (page) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route(animationChunk, async (route) => { await gate; await route.continue(); });
    await page.goto(`${baseURL}/text`);
    await waitForPageReveal(page);
    const input = page.getByRole("combobox", { name: "Search tools" });
    await input.waitFor();
    assert.equal(await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => /\/AnimatedList-/.test(entry.name)).length), 0);

    const requested = page.waitForRequest(animationChunk);
    await input.fill("text counter");
    await requested;
    await page.getByRole("option").waitFor();
    assert.equal(await page.getByRole("option").count(), 1, "Results are available while the animation chunk is delayed");
    await input.press("ArrowDown");
    const selected = await input.getAttribute("aria-activedescendant");
    assert.equal(await page.locator(`[id="${selected}"]`).getAttribute("aria-selected"), "true");
    release();
    await page.waitForFunction(() => document.querySelector('[role="option"]')?.style.opacity === "1");
    assert.equal(await input.getAttribute("aria-activedescendant"), selected, "Loading animation preserves the selected option");
    await input.press("Enter");
    await page.waitForURL(`${baseURL}/text/text-counter`);

    await page.unroute(animationChunk);
    await page.route(animationChunk, (route) => route.abort("failed"));
    await page.goto(`${baseURL}/text`);
    await waitForPageReveal(page);
    const failedRequest = page.waitForRequest(animationChunk);
    await input.fill("text counter");
    await failedRequest;
    await page.getByRole("option").waitFor();
    await input.press("ArrowDown");
    await input.press("Enter");
    await page.waitForURL(`${baseURL}/text/text-counter`);
    assert.deepEqual(errors, [], "An unavailable animation never breaks search or page rendering");
    console.log(`Search results stay immediate and keyboard accessible with delayed/failed animation at ${page.viewportSize().width}px`);
});
