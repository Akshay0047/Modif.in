import assert from "node:assert/strict";
import { auditAccessibility, baseURL, withBrowser, waitForPageReveal } from "./browserHarness.mjs";

await withBrowser(async (page) => {
    for (const hub of ["text", "image", "doc"]) {
        await page.goto(`${baseURL}/${hub}`);
        await waitForPageReveal(page);
        const input = page.getByRole("combobox", { name: "Search tools" });
        await input.fill("converter");
        await page.getByRole("listbox", { name: "Matching tools" }).waitFor();
        assert.equal(await input.getAttribute("aria-expanded"), "true");
        assert.ok(await page.getByRole("option").count() > 0);
        await input.press("ArrowDown");
        const firstId = await input.getAttribute("aria-activedescendant");
        assert.ok(firstId);
        assert.equal(await page.locator(`[id="${firstId}"]`).getAttribute("aria-selected"), "true");
        await input.press("ArrowUp");
        if (await page.getByRole("option").count() > 1) assert.notEqual(await input.getAttribute("aria-activedescendant"), firstId);
        await input.press("Escape");
        assert.equal(await input.inputValue(), "converter");
        assert.equal(await input.getAttribute("aria-expanded"), "false");
        await input.press("ArrowDown");
        await input.press("Tab");
        assert.equal(await input.evaluate((element) => element === document.activeElement), false);
        assert.equal(await input.inputValue(), "converter");
        assert.equal(await page.getByRole("listbox").count(), 0);
        await input.focus();
        await input.press("Shift+Tab");
        assert.equal(await input.evaluate((element) => element === document.activeElement), false);
        await input.fill("no-match-zzzz");
        await page.getByText("No matching tools found.", { exact: true }).waitFor();
        assert.equal(await input.getAttribute("aria-activedescendant"), null);
        await input.fill("converter");
        await input.press("ArrowDown");
        const results = await auditAccessibility(page, ".search-bar");
        assert.deepEqual(results.violations.map(({ id }) => id), []);
        const bounds = await page.getByRole("listbox").boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width);
        await input.press("Enter");
        await page.waitForURL(new RegExp(`/${hub}/[^/]+$`));
        await page.goBack();
        await waitForPageReveal(page);
        await input.fill("converter");
        await page.getByRole("option").first().click();
        await page.waitForURL(new RegExp(`/${hub}/[^/]+$`));
    }
    // Enter during IME composition must leave the query unsubmitted.
    await page.goto(baseURL + "/text");
    await waitForPageReveal(page);
    const input = page.getByRole("combobox", { name: "Search tools" });
    await input.fill("text counter");
    assert.equal(await page.getByRole("option").count(), 1);
    await input.press("ArrowDown");
    await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
    assert.equal(page.url(), baseURL + "/text");
    await input.press("Enter");
    await page.waitForURL(baseURL + "/text/text-counter");
    console.log(`Combobox keyboard, pointer, empty/single/multiple, IME, viewport and axe checks passed at ${page.viewportSize().width}px`);
});
