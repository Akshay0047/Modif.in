import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { installObservers } from "../../scripts/profile-performance.mjs";

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
    // Playwright routing aborts /favicon.ico requests, including the real logo
    // used by this page. Gate chunks through CDP without changing image loads.
    requested.catch(() => {});
    const installed = (async () => {
        const session = await page.context().newCDPSession(page);
        let holding = false;
        let stopped = false;
        const stop = async () => {
            if (stopped) return;
            stopped = true;
            session.off("Fetch.requestPaused", onPaused);
            page.off("close", onClose);
            await session.send("Fetch.disable").catch(() => {});
            await session.detach().catch(() => {});
        };
        const onClose = () => {
            release();
            void stop();
        };
        const onPaused = (event) => {
            void (async () => {
                const matches = pattern.test(event.request.url);
                if (matches) {
                    holding = true;
                    await gate;
                }
                if (stopped) return;
                await session.send("Fetch.continueRequest", { requestId: event.requestId });
                if (matches) await stop();
            })().catch(() => stop());
        };
        session.on("Fetch.requestPaused", onPaused);
        page.once("close", onClose);
        await session.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
        void gate.then(() => { if (!holding) return stop(); });
    })();
    return { installed, requested, release };
}

async function covered(page) {
    await page.locator('#page-loader[data-state="loading"]').waitFor();
    assert.equal(await page.locator("#page-loader").isVisible(), true);
    assert.deepEqual(await page.locator("#page-loader").evaluate((loader) => {
        const style = getComputedStyle(loader);
        return { opacity: style.opacity, background: style.backgroundColor };
    }), { opacity: "1", background: "rgb(0, 0, 0)" }, "Only the logo pulses; the opaque cover must hide mounting content");
    if (await page.locator("#page-content").count()) {
        assert.equal(await page.locator("#page-content").evaluate((content) => content.inert), true, "Partial page controls cannot receive focus while covered");
        assert.equal(await page.locator(".skip-link").evaluate((link) => link.inert), true, "The skip link cannot target covered content");
        assert.equal(await page.locator("#root").evaluate((root) => root.inert), false, "Loading leaves the header interactive");
        const headerGeometry = await page.locator(".app-header").evaluate((header) => {
            const rect = header.getBoundingClientRect();
            const cover = document.getElementById("page-loader").getBoundingClientRect();
            const controls = [...header.querySelectorAll("a, button")];
            return {
                top: rect.top,
                bottom: rect.bottom,
                coverTop: cover.top,
                controlsExposed: controls.every((control) => {
                    const bounds = control.getBoundingClientRect();
                    return control.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
                }),
            };
        });
        assert.equal(headerGeometry.top, 0, "The navbar remains pinned to the top");
        assert.ok(headerGeometry.coverTop >= headerGeometry.bottom - 1, "The loading cover starts below the navbar");
        assert.equal(headerGeometry.controlsExposed, true, "The loading cover cannot intercept header controls");
    } else {
        assert.equal(await page.locator("#root").evaluate((root) => root.inert), true, "The empty boot root remains isolated until the app starts");
    }
    const logo = page.locator("img.page-loader__logo");
    await page.waitForFunction(() => {
        const image = document.querySelector("img.page-loader__logo");
        return image?.complete && image.naturalWidth > 0;
    });
    await logo.evaluate((image) => image.decode());
    assert.equal(await logo.getAttribute("src"), "/favicon.ico", "The loader uses the same graphic logo as the footer");
    assert.equal(await logo.getAttribute("alt"), "", "The loading status supplies the accessible name without repeating the logo");
    const geometry = await page.locator(".page-loader__logo").evaluate((logo) => {
        const rect = logo.getBoundingClientRect();
        const cover = logo.closest("#page-loader").getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, centerX: cover.x + cover.width / 2, centerY: cover.y + cover.height / 2 };
    });
    assert.ok(Math.abs(geometry.x - geometry.centerX) <= 3, "The loading logo is centered horizontally");
    assert.ok(Math.abs(geometry.y - geometry.centerY) <= 3, "The loading logo is centered vertically");
}

async function revealed(page, { inert = false } = {}) {
    await page.locator('#page-loader[data-state="hidden"]').waitFor({ state: "attached", timeout: 18000 });
    assert.equal(await page.locator("#page-loader").isVisible(), false);
    assert.equal(await page.locator("#root").evaluate((root) => root.inert), inert, "Revealing releases its own keyboard isolation without overriding another modal");
    assert.equal(await page.locator("#page-content").evaluate((content) => content.inert), false, "Revealing releases the content lock");
    assert.equal(await page.locator(".skip-link").evaluate((link) => link.inert), false, "The skip link returns when its destination is ready");
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
                await page.addInitScript(installObservers, { selector: path === "/" ? ".hero-search input" : ".search-bar__input" });
                const background = hold(page, sceneChunk(scene));
                await background.installed;
                try {
                    await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
                    await background.requested;
                    await page.locator("#main-content h1").waitFor();
                    await covered(page);
                    assert.equal(await page.evaluate(() => window.__performanceProfile.readyMs), null, "A covered control is not reported as usable by the profiler");
                    assert.equal(await page.locator("canvas[data-scene-ready='true']").count(), 0);
                    await page.keyboard.press("Tab");
                    assert.equal(await page.locator(".app-header").evaluate((header) => header.contains(document.activeElement)), true, "Tab reaches the navbar while the page is covered");
                    assert.equal(await page.locator("#page-content").evaluate((content) => content.contains(document.activeElement)), false, "Tab cannot enter partially mounted page content");
                    await page.screenshot({ path: resolve(output, `${viewport.width}-${scene.toLowerCase()}-navbar-loader.png`) });
                    background.release();
                    await revealed(page);
                    await page.waitForFunction(() => window.__performanceProfile.readyAfterPaintMs !== null);
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
                const pendingTool = await delayed.requested;
                await covered(page);
                const navigation = page.getByRole("navigation", { name: "Tool hubs" });
                await navigation.getByRole("link", { name: "Image", exact: true }).focus();
                assert.equal(await navigation.getByRole("link", { name: "Image", exact: true }).evaluate((link) => document.activeElement === link), true, "Header links remain keyboard accessible while loading");
                await navigation.getByRole("link", { name: "Image", exact: true }).click();
                await page.waitForURL(`${baseURL}/image`);
                await revealed(page);
                delayed.release();
                const lateResponse = await pendingTool.response();
                await lateResponse?.finished();
                await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                await revealed(page);
                assert.equal(new URL(page.url()).pathname, "/image", "A late tool import cannot restore an abandoned route or loading cover");
                await navigation.getByRole("link", { name: "Text", exact: true }).click();
                await revealed(page);
                await page.locator('a.tool-button[href="/text/text-counter"]').first().click();
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
            assert.equal(await page.locator("#root").evaluate((root) => root.inert), false, "Closing a legal modal releases the navbar");
            assert.equal(await page.locator("#page-content").evaluate((content) => content.inert), true, "Closing a legal modal cannot release a loader that is still covering the content");
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
