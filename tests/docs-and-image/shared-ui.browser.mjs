import assert from "node:assert/strict";
import { baseURL, withBrowser } from "../text-and-shell/browserHarness.mjs";

await withBrowser(async (page) => {
    await page.goto(`${baseURL}/text`);
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

    const privacy = page.getByRole("button", { name: "Privacy Policy", exact: true });
    await privacy.click();
    const dialog = page.getByRole("dialog", { name: "Privacy Policy", exact: true });
    await dialog.waitFor();
    assert.equal(await page.getByRole("button", { name: "Close document", exact: true }).evaluate((element) => element === document.activeElement), true);
    assert.equal(await privacy.evaluate((element) => element.closest("footer").inert), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
    await page.keyboard.press("Tab");
    assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(await privacy.evaluate((element) => element === document.activeElement), true);
    assert.equal(await privacy.evaluate((element) => element.closest("footer").inert), false);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");

    await page.goto(`${baseURL}/image/favicon-generator`);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.waitForURL(`${baseURL}/image`);
});

console.log("Static Silk color changes, legal modal focus, and direct-visit Back passed at desktop and mobile sizes.");
