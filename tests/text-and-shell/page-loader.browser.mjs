import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href : "playwright");
const baseURL = process.env.MODIF_BASE_URL || "http://127.0.0.1:4186";
const output = resolve(".git/frontend-audit/loading-screen");
const entryChunk = /\/(?:assets\/index-[^/]+\.js|src\/main\.jsx)(?:\?.*)?$/;
const sceneChunk = (name) => new RegExp(`/((assets/${name}-[^/]+\\.js)|(src/components/${name}\\.jsx))(\\?.*)?$`);
const toolChunk = (name) => new RegExp(`/((assets/${name}-[^/]+\\.js)|(src/modules/text/${name}/index\\.jsx))(\\?.*)?$`);
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
await mkdir(output, { recursive: true });

function hold(page, pattern) {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const requested = page.waitForRequest(pattern);
    const installed = page.route(pattern, async (route) => {
        await gate;
        await route.continue();
    });
    return { installed, requested, release };
}

async function covered(page) {
    await page.locator('#page-loader[data-state="loading"]').waitFor();
    assert.equal(await page.locator("#page-loader").isVisible(), true);
    assert.deepEqual(await page.locator("#page-loader").evaluate((loader) => {
        const style = getComputedStyle(loader);
        return { opacity: style.opacity, background: style.backgroundColor };
    }), { opacity: "1", background: "rgb(0, 0, 0)" }, "Only the logo pulses; the opaque cover must hide mounting content");
    assert.equal(await page.locator("#root").evaluate((root) => root.inert), true, "Partial page controls cannot receive focus while covered");
    assert.equal((await page.locator(".page-loader__logo").textContent()).trim(), "MODIF.in");
    const geometry = await page.locator(".page-loader__logo").evaluate((logo) => {
        const rect = logo.getBoundingClientRect();
        const cover = logo.closest("#page-loader").getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, centerX: cover.x + cover.width / 2, centerY: cover.y + cover.height / 2 };
    });
    assert.ok(Math.abs(geometry.x - geometry.centerX) <= 3, "The loading wordmark is centered horizontally");
    assert.ok(Math.abs(geometry.y - geometry.centerY) <= 3, "The loading wordmark is centered vertically");
}

async function revealed(page, { inert = false } = {}) {
    await page.locator('#page-loader[data-state="hidden"]').waitFor({ state: "attached", timeout: 18000 });
    assert.equal(await page.locator("#page-loader").isVisible(), false);
    assert.equal(await page.locator("#root").evaluate((root) => root.inert), inert, "Revealing releases its own keyboard isolation without overriding another modal");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "The loader creates no horizontal page overflow");
}

async function run(viewport, execute, options = {}) {
    const context = await browser.newContext({
        viewport,
        isMobile: viewport.width < 600,
        hasTouch: viewport.width < 600,
        reducedMotion: "no-preference",
        ...options,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await execute(page, context);
        assert.deepEqual(errors, [], "Loader success and recovery do not produce uncaught page errors");
    } finally {
        await context.close();
    }
}

try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
        await run(viewport, async (page) => {
            const entry = hold(page, entryChunk);
            await entry.installed;
            try {
                await page.goto(`${baseURL}/text`, { waitUntil: "commit" });
                await entry.requested;
                await covered(page);
                assert.equal(await page.locator("#root").evaluate((root) => root.childElementCount), 0, "The logo is present before React starts");
                assert.notEqual(await page.locator(".page-loader__logo").evaluate((logo) => getComputedStyle(logo).animationName), "none", "The normal-motion logo pulses");
                await page.screenshot({ path: resolve(output, `${viewport.width}-boot-loader.png`) });
                entry.release();
                await revealed(page);
                await page.getByRole("combobox", { name: "Search tools" }).fill("text counter");
                await page.getByRole("option").waitFor();
            } finally {
                entry.release();
            }
        });

        for (const [path, scene] of [["/", "Dither"], ["/doc", "Silk"]]) {
            await run(viewport, async (page) => {
                const background = hold(page, sceneChunk(scene));
                await background.installed;
                try {
                    await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
                    await background.requested;
                    await page.locator("#main-content h1").waitFor();
                    await covered(page);
                    assert.equal(await page.locator("canvas[data-scene-ready='true']").count(), 0);
                    await page.keyboard.press("Tab");
                    assert.equal(await page.evaluate(() => document.getElementById("root").contains(document.activeElement)), false, "Tab cannot enter a partially mounted page");
                    background.release();
                    await revealed(page);
                    await page.locator("canvas[data-scene-ready='true']").first().waitFor();
                    const main = page.locator("#main-content");
                    assert.equal(await main.count(), 1);
                } finally {
                    background.release();
                }
            });
        }

        await run(viewport, async (page) => {
            await page.goto(`${baseURL}/text`);
            await revealed(page);
            const delayed = hold(page, toolChunk("text-counter"));
            await delayed.installed;
            try {
                await page.locator('a.tool-button[href="/text/text-counter"]').first().click();
                await delayed.requested;
                await covered(page);
                delayed.release();
                await revealed(page);
                await page.locator("#text-counter-input").fill("The complete workspace is ready.");
                await page.getByRole("link", { name: "Text", exact: true }).click();
                await revealed(page);
            } finally {
                delayed.release();
            }

            await page.route(toolChunk("case-converter"), (route) => route.abort("failed"));
            await page.locator('a.tool-button[href="/text/case-converter"]').first().click();
            await revealed(page);
            await page.getByRole("heading", { name: "This page could not load", exact: true }).waitFor();
            await page.getByRole("navigation", { name: "Loading recovery" }).getByRole("link", { name: "Text tools", exact: true }).click();
            await revealed(page);
            await page.goto(`${baseURL}/loader-check-missing-page`);
            await revealed(page);
            await page.locator(".not-found-page h1").waitFor();
        });

        await run(viewport, async (page) => {
            await page.route(sceneChunk("Silk"), (route) => route.abort("failed"));
            await page.goto(`${baseURL}/text`);
            await revealed(page);
            await page.getByRole("combobox", { name: "Search tools" }).fill("text counter");
            await page.getByRole("option").waitFor();
            assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).cursor), "none", "A failed optional background leaves the native cursor usable");
        });

        for (const setting of ["reduced", "paused"]) {
            await run(viewport, async (page) => {
                if (setting === "paused") await page.addInitScript(() => localStorage.setItem("modif-animation", "off"));
                const entry = hold(page, entryChunk);
                await entry.installed;
                try {
                    await page.goto(`${baseURL}/text`, { waitUntil: "commit" });
                    await entry.requested;
                    await covered(page);
                    assert.equal(await page.locator(".page-loader__logo").evaluate((logo) => getComputedStyle(logo).animationName), "none", `${setting} motion uses a still logo`);
                    entry.release();
                    await revealed(page);
                } finally {
                    entry.release();
                }
            }, { reducedMotion: setting === "reduced" ? "reduce" : "no-preference" });
        }

        await run(viewport, async (page) => {
            await page.goto(`${baseURL}/text`);
            await revealed(page);
            await page.getByRole("navigation", { name: "Tool hubs" }).getByRole("link", { name: "Image", exact: true }).click();
            await revealed(page);
            await page.getByRole("button", { name: "Privacy Policy", exact: true }).click();
            const dialog = page.getByRole("dialog", { name: "Privacy Policy", exact: true });
            await dialog.waitFor();
            await page.goBack();
            await page.waitForURL(`${baseURL}/text`);
            await revealed(page, { inert: true });
            assert.equal(await dialog.isVisible(), true, "The legal document survives same-shell history navigation");
            await page.keyboard.press("Tab");
            assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true, "History navigation preserves the document's focus isolation");
            await page.keyboard.press("Escape");
            await dialog.waitFor({ state: "detached" });
            assert.equal(await page.locator("#root").evaluate((root) => root.inert), false);
            await page.getByRole("combobox", { name: "Search tools" }).fill("text counter");
            await page.getByRole("button", { name: "Clear search", exact: true }).click();

            await page.getByRole("navigation", { name: "Tool hubs" }).getByRole("link", { name: "Image", exact: true }).click();
            await revealed(page);
            await page.getByRole("button", { name: "Privacy Policy", exact: true }).click();
            await dialog.waitFor();
            // Expand the real reveal transition's short overlap so closing a
            // legal modal during a still-covered history change is deterministic.
            await page.addStyleTag({ content: '.page-loader[data-state="revealing"] { transition-duration: 1s !important; }' });
            await page.goBack();
            await page.waitForURL(`${baseURL}/text`);
            await page.locator('#page-loader[data-state="revealing"]').waitFor({ state: "attached" });
            await dialog.getByRole("button", { name: "Close document", exact: true }).click();
            await dialog.waitFor({ state: "detached" });
            assert.equal(await page.locator("#root").evaluate((root) => root.inert), true, "Closing a legal modal cannot release a loader that is still covering the page");
            await revealed(page);
            await page.getByRole("combobox", { name: "Search tools" }).fill("text counter");
        });
        console.log(`Loading logo, deferred scenes, route recovery, keyboard isolation and motion preferences passed at ${viewport.width}px`);
    }

    await run({ width: 1440, height: 900 }, async (page) => {
        await page.addInitScript(() => {
            const schedule = window.setTimeout.bind(window);
            window.setTimeout = (callback, delay, ...args) => schedule(callback, delay === 20000 ? 250 : delay, ...args);
        });
        const entry = hold(page, entryChunk);
        await entry.installed;
        try {
            await page.goto(`${baseURL}/text`, { waitUntil: "commit" });
            await entry.requested;
            await page.locator('#page-loader[data-state="failed"][role="alert"]').waitFor();
            const reload = page.getByRole("button", { name: "Reload page", exact: true });
            await reload.waitFor();
            await reload.focus();
            assert.equal(await reload.evaluate((button) => document.activeElement === button), true, "A failed application entry exposes keyboard-accessible recovery");
            entry.release();
            await revealed(page);
        } finally {
            entry.release();
        }
    });

    await run({ width: 1440, height: 900 }, async (page) => {
        await page.goto(`${baseURL}/text`);
        await revealed(page);
        // Speed up only the loader's safety deadline, preserving the actual
        // suspended import so this tests recovery rather than a fast success.
        await page.evaluate(() => {
            const schedule = window.setTimeout.bind(window);
            window.setTimeout = (callback, delay, ...args) => schedule(callback, delay === 15000 ? 250 : delay, ...args);
        });
        const chunk = hold(page, toolChunk("case-converter"));
        await chunk.installed;
        try {
            await page.locator('a.tool-button[href="/text/case-converter"]').first().click();
            await chunk.requested;
            await revealed(page);
            await page.getByRole("navigation", { name: "Loading recovery" }).getByRole("link", { name: "Home", exact: true }).waitFor();
            assert.equal(await page.locator(".route-feedback[role='status']").isVisible(), true, "A stuck import cannot trap the page behind a permanent logo");
        } finally {
            chunk.release();
        }
    });
    console.log("Blocked entry and bounded route deadline expose usable recovery, and late entry startup still reveals normally.");
} finally {
    await browser.close();
}
