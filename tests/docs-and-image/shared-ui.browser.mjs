import assert from "node:assert/strict";
import { baseURL, withBrowser, waitForPageReveal } from "../text-and-shell/browserHarness.mjs";

await withBrowser(async (page) => {
    await page.goto(`${baseURL}/text`);
    await waitForPageReveal(page);
    await page.locator(".app-silk-backdrop canvas").waitFor();
    // Isolate the persistent background from animated text/cursor overlays.
    const hideMain = await page.addStyleTag({ content: "main { visibility: hidden !important; }" });
    await page.waitForTimeout(300);
    const clip = { x: 0, y: 60, width: 100, height: 100 };
    const textBackground = await page.screenshot({ clip });
    await page.waitForTimeout(150);
    assert.deepEqual(await page.screenshot({ clip }), textBackground, "Reduced-motion background must remain still");
    await page.evaluate(() => {
        history.pushState({ idx: 1 }, "", "/image");
        window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.getByText("A dedicated suite for image manipulation and processing", { exact: true }).waitFor({ state: "attached" });
    await page.waitForTimeout(150);
    const imageBackground = await page.screenshot({ clip });
    assert.notDeepEqual(imageBackground, textBackground, "Module colors must repaint even when Silk uses demand rendering");
    await page.waitForTimeout(150);
    assert.deepEqual(await page.screenshot({ clip }), imageBackground);
    await hideMain.evaluate((element) => element.remove());

    for (const title of ["Privacy Policy", "Terms of Service", "Disclaimer"]) {
        const opener = page.getByRole("button", { name: title, exact: true });
        const openerHandle = await opener.elementHandle();
        const previousOverflow = await page.evaluate(() => document.body.style.overflow);
        await opener.click();
        const dialog = page.getByRole("dialog", { name: title, exact: true });
        await dialog.waitFor();
        assert.equal(await page.getByRole("button", { name: "Close document", exact: true }).evaluate((element) => element === document.activeElement), true);
        assert.equal(await openerHandle.evaluate((element) => element.closest("[inert]") !== null), true);
        assert.equal(await page.locator(".app-header").evaluate((element) => element.closest("[inert]") !== null), true);
        await page.keyboard.press("Shift+Tab");
        assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
        await page.keyboard.press("Tab");
        assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached" });
        assert.equal(await openerHandle.evaluate((element) => element === document.activeElement), true);
        assert.equal(await openerHandle.evaluate((element) => element.closest("[inert]") !== null), false);
        assert.equal(await page.evaluate(() => document.body.style.overflow), previousOverflow);
    }

    await page.goto(`${baseURL}/image/favicon-generator`);
    await waitForPageReveal(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.waitForURL(`${baseURL}/image`);
});

console.log("Static Silk color changes, legal modal focus, and direct-visit Back passed at desktop and mobile sizes.");
