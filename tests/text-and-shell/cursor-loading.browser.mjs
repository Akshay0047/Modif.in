import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve, join, dirname, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href : "playwright");
const project = resolve(import.meta.dirname, "../..").replaceAll("\\", "/");
const temporary = await mkdtemp(join(tmpdir(), "modif-cursor-loading-"));
assert.equal(resolve(dirname(temporary)), resolve(tmpdir()), "Fixture cleanup must stay inside the OS temporary directory");
await writeFile(join(temporary, "index.html"), '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>.native-crosshair{cursor:crosshair}.native-grab{cursor:grab}.native-resize{cursor:nwse-resize}.native-range{cursor:ew-resize}</style></head><body><div id="root"></div><script type="module" src="/harness.jsx"></script></body></html>');
await writeFile(join(temporary, "harness.jsx"), `
import React from ${JSON.stringify(`${project}/node_modules/react/index.js`)};
import { createRoot } from ${JSON.stringify(`${project}/node_modules/react-dom/client.js`)};
import { BrowserRouter, Link, useLocation } from ${JSON.stringify(`${project}/node_modules/react-router-dom/dist/index.mjs`)};
import ${JSON.stringify(`${project}/src/index.css`)};
import AppSilkBackdrop from ${JSON.stringify(`${project}/src/components/AppSilkBackdrop.jsx`)};
import LandingPage from ${JSON.stringify(`${project}/src/pages/LandingPage.jsx`)};
import { AnimationProvider, useAnimationSettings } from ${JSON.stringify(`${project}/src/contexts/AnimationContext.jsx`)};

window.caughtDecorationErrors = 0;
function Controls() {
    const { enabled, toggle } = useAnimationSettings();
    return <button id="toggle-motion" className="cursor-target" onClick={toggle}>{enabled ? "Pause" : "Resume"}</button>;
}
function CursorFixture() {
    const { pathname } = useLocation();
    return <main style={{ padding: 20 }}>
        <Controls /><p id="route">{pathname}</p>
        <div id="default-area" style={{ padding: 30 }}>Default cursor surface</div>
        <Link id="navigation" className="cursor-target" to={pathname === "/" ? "/next" : "/"}><span>Navigate</span></Link>
        <button id="action" className="cursor-target"><span>Action</span></button>
        <button id="disabled" className="cursor-target" disabled>Unavailable</button>
        <button id="aria-disabled" className="cursor-target" aria-disabled="true">Unavailable action</button>
        <label>Text<input id="text-input" className="cursor-target" /></label>
        <label>Notes<textarea id="textarea" className="cursor-target" /></label>
        <div id="editable" className="cursor-target" contentEditable suppressContentEditableWarning>Editable text</div>
        <div id="crosshair" className="cursor-target native-crosshair" style={{ padding: 20 }}>Crop canvas</div>
        <div id="grab" className="cursor-target native-grab" style={{ padding: 20 }}>Draggable preview</div>
        <div id="resize" className="cursor-target native-resize" style={{ padding: 20 }}>Resize handle</div>
        <label>Range<input id="range" className="cursor-target native-range" type="range" /></label>
    </main>;
}
function Fixture() {
    const scene = new URLSearchParams(location.search).get("scene");
    if (scene === "home") return <LandingPage />;
    if (scene === "silk") return <><AppSilkBackdrop visible color1="#1a0505" color2="#4a0f0f" /><main><h1>Working text tool</h1><label>Text<input id="workspace-input" /></label></main></>;
    return <CursorFixture />;
}
createRoot(document.getElementById("root"), { onCaughtError: () => { window.caughtDecorationErrors++; } }).render(<BrowserRouter><AnimationProvider><Fixture /></AnimationProvider></BrowserRouter>);
`);
const bundle = await build({ configFile: false, root: temporary, publicDir: false, plugins: [react()],
    resolve: { alias: { react: `${project}/node_modules/react`, "react-dom": `${project}/node_modules/react-dom` } },
    logLevel: "error", build: { outDir: join(temporary, "dist"), emptyOutDir: true, assetsInlineLimit: 0 } });
const output = (Array.isArray(bundle) ? bundle : [bundle]).flatMap((item) => item.output);
const chunks = output.filter((item) => item.type === "chunk");
const silkChunk = chunks.find((chunk) => chunk.facadeModuleId?.replaceAll("\\", "/").endsWith("/src/components/Silk.jsx"));
const ditherChunk = chunks.find((chunk) => chunk.facadeModuleId?.replaceAll("\\", "/").endsWith("/src/components/Dither.jsx"));
assert.ok(silkChunk?.isDynamicEntry && ditherChunk?.isDynamicEntry, "Real Silk and Dither components must remain lazy entries");
assert.ok(chunks.every((chunk) => Object.keys(chunk.modules).every((id) => !/\/(?:components\/TargetCursor\.jsx|node_modules\/gsap\/)/.test(id.replaceAll("\\", "/")))), "The cursor must ship without the Reactbits overlay or GSAP");
const cursorAssets = output.filter((item) => item.type === "asset" && /\/arrow(?:-active)?-[^/]+\.svg$/.test(item.fileName));
assert.equal(cursorAssets.length, 2, "Both browser-owned cursor SVGs must be emitted");
for (const asset of cursorAssets) assert.match(await readFile(join(temporary, "dist", asset.fileName), "utf8"), /<svg\b/);
const cursorPaths = new Set(cursorAssets.map((asset) => `/${asset.fileName}`));

const server = createServer(async (request, response) => {
    try {
        const path = new URL(request.url, "http://localhost").pathname;
        const file = join(temporary, "dist", path === "/" || path === "/next" ? "index.html" : path);
        response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" })[extname(file)] || "application/octet-stream");
        response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const harnessURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const cursorOf = (page, selector) => page.locator(selector).evaluate((element) => getComputedStyle(element).cursor);
const isCustom = (cursor) => cursor.includes("url(") && /\s4\s3,\s*(?:auto|default|pointer)$/.test(cursor);
const assertNoOverlay = async (page) => {
    assert.equal(await page.locator(".target-cursor-wrapper").count(), 0);
    assert.equal(await page.evaluate(() => document.body.classList.contains("target-cursor-active")), false);
    assert.notEqual(await cursorOf(page, "body"), "none");
};

try {
    for (const settings of [
        { name: "desktop", viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" },
        { name: "reduced motion", viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" },
        { name: "paused animation", viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference", paused: true },
        { name: "coarse pointer", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "no-preference", native: true },
        { name: "forced colors", viewport: { width: 1440, height: 1000 }, forcedColors: "active", native: true },
    ]) {
        const { name, paused, native, ...options } = settings;
        const context = await browser.newContext(options);
        if (paused) await context.addInitScript(() => localStorage.setItem("modif-animation", "off"));
        const page = await context.newPage(), errors = [], requested = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("request", (request) => requested.push(new URL(request.url()).pathname));
        await page.goto(harnessURL);
        await page.locator("#toggle-motion").waitFor();
        await assertNoOverlay(page);
        const standard = await cursorOf(page, "#default-area");
        const interactive = await cursorOf(page, "#action");
        assert.equal(isCustom(standard), !native, `${name}: default cursor eligibility`);
        assert.equal(isCustom(interactive), !native, `${name}: action cursor eligibility`);
        if (!native) {
            assert.notEqual(standard, interactive, `${name}: actionable targets use their accent cursor`);
            assert.equal(await cursorOf(page, "#action span"), interactive, "Nested button content inherits its action cursor");
            assert.equal(await cursorOf(page, "#navigation span"), interactive, "Nested link content inherits its action cursor");
            for (const [selector, expected] of [
                ["#text-input", "text"], ["#textarea", "text"], ["#editable", "text"],
                ["#disabled", "not-allowed"], ["#aria-disabled", "not-allowed"],
                ["#crosshair", "crosshair"], ["#grab", "grab"], ["#resize", "nwse-resize"], ["#range", "ew-resize"],
            ]) assert.equal(await cursorOf(page, selector), expected, `${name}: ${selector} retains its semantic cursor`);
            await page.locator("#text-input").fill("Cursor does not interfere with editing");
            assert.equal(await page.locator("#text-input").inputValue(), "Cursor does not interfere with editing");
            await page.locator("#navigation").click();
            await page.waitForURL("**/next");
            assert.equal(await cursorOf(page, "#default-area"), standard, "Cursor survives route navigation");
            await page.goBack();
            await page.waitForURL(harnessURL + "/");
            await page.locator("#toggle-motion").click();
            assert.equal(await cursorOf(page, "#default-area"), standard, "A static cursor does not depend on the animation toggle");
            await page.emulateMedia({ reducedMotion: "reduce" });
            assert.equal(await cursorOf(page, "#default-area"), standard, "Live motion changes do not affect a static cursor");
            await page.emulateMedia({ forcedColors: "active" });
            assert.equal((await cursorOf(page, "#default-area")).includes("url("), false, "Forced colors restores native cursors immediately");
            await page.emulateMedia({ forcedColors: "none" });
            assert.equal(await cursorOf(page, "#default-area"), standard, "Leaving forced colors restores the custom cursor");
        } else assert.ok(requested.every((path) => !cursorPaths.has(path)), `${name}: unused custom cursor assets are not fetched`);
        assert.deepEqual(errors, [], name);
        await context.close();
    }

    // A failed SVG keeps a platform fallback in its declaration. A failed
    // stylesheet leaves the browser in charge too; neither path hides input.
    for (const failure of ["cursor SVG", "stylesheet"]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage(), blocked = [];
        await page.route((url) => failure === "cursor SVG" ? cursorPaths.has(url.pathname) : url.pathname.endsWith(".css"), (route) => {
            blocked.push(new URL(route.request().url()).pathname);
            return route.abort("failed");
        });
        await page.goto(harnessURL);
        await page.locator("#action").hover();
        await page.locator("#default-area").hover();
        await assertNoOverlay(page);
        for (const selector of ["#default-area", "#action"]) {
            const cursor = await cursorOf(page, selector);
            if (failure === "cursor SVG") assert.match(cursor, /,\s*(?:auto|default|pointer)$/, "Unavailable images retain a native fallback");
            else assert.equal(cursor.includes("url("), false, "Missing CSS retains a native cursor");
        }
        assert.ok(blocked.length > 0, `${failure} failure was exercised`);
        await page.locator("#text-input").fill("Still editable after a cursor asset failure");
        await page.locator("#toggle-motion").click();
        await page.getByRole("button", { name: "Resume", exact: true }).waitFor();
        await context.close();
    }

    // Optional shader imports still recover locally without replacing a tool
    // workspace or preventing home-page navigation.
    for (const { scene, chunk } of [{ scene: "silk", chunk: silkChunk }, { scene: "home", chunk: ditherChunk }]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
        const page = await context.newPage(), errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route((url) => url.pathname === `/${chunk.fileName}`, (route) => route.abort("failed"));
        await page.goto(`${harnessURL}/?scene=${scene}`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => window.caughtDecorationErrors > 0);
        assert.deepEqual(errors, [], `${scene} chunk failure must be caught locally`);
        await assertNoOverlay(page);
        assert.equal(await page.locator(".route-feedback").count(), 0, "Optional decoration must not trigger route failure UI");
        if (scene === "silk") {
            await page.getByRole("heading", { name: "Working text tool", exact: true }).waitFor();
            await page.locator("#workspace-input").fill("Still usable with a failed background import.");
            assert.equal(await page.locator("#workspace-input").inputValue(), "Still usable with a failed background import.");
            assert.match(await page.locator(".app-silk-backdrop").evaluate((element) => element.style.background), /linear-gradient/);
        } else {
            await page.getByRole("heading", { name: "MODIF.in", exact: true }).waitFor();
            assert.equal(await page.locator(".hero-editor-cards a").count(), 3);
            await page.getByRole("navigation", { name: "Common tasks" }).getByRole("link", { name: "Merge PDF", exact: true }).click();
            assert.equal(new URL(page.url()).pathname, "/doc/pdf-merger");
            await page.locator("footer").waitFor();
        }
        await context.close();
    }
    console.log("Cursor checks passed: browser-owned SVG cursors, native semantic states, routes, motion/forced-color preferences, asset fallbacks, and contained Silk/Dither import failures.");
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
}
