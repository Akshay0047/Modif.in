import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile, rm } from "node:fs/promises";
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
await writeFile(join(temporary, "index.html"), '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/harness.jsx"></script></body></html>');
await writeFile(join(temporary, "harness.jsx"), `
import React from ${JSON.stringify(`${project}/node_modules/react/index.js`)};
import { createRoot } from ${JSON.stringify(`${project}/node_modules/react-dom/client.js`)};
import CursorLayer from ${JSON.stringify(`${project}/src/components/CursorLayer.jsx`)};
import { AnimationProvider, useAnimationSettings } from ${JSON.stringify(`${project}/src/contexts/AnimationContext.jsx`)};
document.body.style.cursor = "crosshair";
function Controls() {
    const { enabled, toggle } = useAnimationSettings();
    return <button id="toggle-motion" className="cursor-target" onClick={toggle}>{enabled ? "Pause" : "Resume"}</button>;
}
createRoot(document.getElementById("root")).render(<AnimationProvider><Controls /><CursorLayer /></AnimationProvider>);
`);
const bundle = await build({ configFile: false, root: temporary, publicDir: false, plugins: [react()],
    resolve: { alias: { react: `${project}/node_modules/react`, "react-dom": `${project}/node_modules/react-dom` } },
    logLevel: "error", build: { outDir: join(temporary, "dist"), emptyOutDir: true } });
const chunks = (Array.isArray(bundle) ? bundle : [bundle]).flatMap((item) => item.output).filter((item) => item.type === "chunk");
const cursorChunk = chunks.find((chunk) => chunk.facadeModuleId?.replaceAll("\\", "/").endsWith("/src/components/TargetCursor.jsx"));
const gsapChunks = chunks.filter((chunk) => Object.keys(chunk.modules).some((id) => id.replaceAll("\\", "/").includes("/node_modules/gsap/")));
assert.ok(cursorChunk?.isDynamicEntry, "TargetCursor must be a separate dynamic entry");
assert.ok(gsapChunks.length > 0, "The fixture must locate actual GSAP code");
assert.ok(gsapChunks.every((chunk) => !chunk.isEntry), "GSAP must be absent from the initial entry");
const forbiddenAssets = new Set([cursorChunk.fileName, ...gsapChunks.map((chunk) => chunk.fileName)]);
// Ensure these are real emitted files, not only bundler metadata.
const assets = await readdir(join(temporary, "dist/assets"));
assert.ok([...forbiddenAssets].every((file) => assets.includes(file.split("/").at(-1))));

const server = createServer(async (request, response) => {
    try {
        const path = new URL(request.url, "http://localhost").pathname;
        const file = join(temporary, "dist", path === "/" ? "index.html" : path);
        response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css" })[extname(file)] || "application/octet-stream");
        response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const harnessURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });

try {
    for (const settings of [
        { name: "coarse pointer", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "no-preference" },
        { name: "reduced motion", viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" },
        { name: "paused animation", viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference", paused: true },
    ]) {
        const { name, paused, ...options } = settings;
        const context = await browser.newContext(options);
        if (paused) await context.addInitScript(() => localStorage.setItem("modif-animation", "off"));
        const page = await context.newPage(), requested = [];
        page.on("request", (request) => requested.push(new URL(request.url()).pathname.slice(1)));
        await page.goto(harnessURL);
        await page.locator("#toggle-motion").waitFor();
        await page.waitForTimeout(150);
        assert.equal(await page.locator(".target-cursor-wrapper").count(), 0, name);
        assert.equal(await page.evaluate(() => document.body.style.cursor), "crosshair", name);
        assert.ok(requested.every((asset) => !forbiddenAssets.has(asset)), `${name} must not fetch TargetCursor or GSAP`);
        if (paused) {
            await page.locator("#toggle-motion").click();
            await page.waitForFunction(() => document.body.classList.contains("target-cursor-active"));
            assert.ok(requested.some((asset) => forbiddenAssets.has(asset)), "Resume should load the eligible desktop cursor");
        } else if (name === "reduced motion") {
            await page.emulateMedia({ reducedMotion: "no-preference" });
            await page.waitForFunction(() => document.body.classList.contains("target-cursor-active"));
            assert.ok(requested.some((asset) => forbiddenAssets.has(asset)), "Live media changes should load the cursor when supported");
        }
        await context.close();
    }

    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
    const page = await desktop.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let release;
    const chunkGate = new Promise((resolve) => { release = resolve; });
    await page.route((url) => forbiddenAssets.has(url.pathname.slice(1)), async (route) => { await chunkGate; await route.continue(); });
    await page.goto(harnessURL, { waitUntil: "domcontentloaded" });
    await page.locator("#toggle-motion").waitFor();
    assert.equal(await page.evaluate(() => document.body.style.cursor), "crosshair", "Native cursor must remain while the lazy chunk is loading");
    assert.equal(await page.locator(".target-cursor-wrapper").count(), 0);
    release();
    await page.waitForFunction(() => document.body.classList.contains("target-cursor-active"));
    await page.mouse.move(400, 300);
    const initialTransform = await page.locator(".target-cursor-wrapper").evaluate((element) => element.style.transform);
    await page.waitForFunction((before) => document.querySelector(".target-cursor-wrapper").style.transform !== before, initialTransform);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.body.classList.contains("target-cursor-active"));
    assert.equal(await page.evaluate(() => document.body.style.cursor), "crosshair");
    assert.equal(await page.locator(".target-cursor-wrapper").count(), 0);
    assert.deepEqual(errors, []);
    await desktop.close();
    console.log("Cursor loading passed: GSAP excluded from entry, zero cursor/GSAP requests on coarse/reduced/paused devices, live resume/media changes, native loading fallback, and animated desktop cursor.");
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
}
