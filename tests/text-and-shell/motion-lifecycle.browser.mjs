// Exercise the production Reactbits components in an isolated, temporary build.
// Pixel appearance is covered by graphics-lint-regression.mjs; this suite checks
// that pause keeps the same canvas, stops GPU work, and resumes its shader time.
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve, join, extname, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href : "playwright");
const project = resolve(import.meta.dirname, "../..").replaceAll("\\", "/");
const temporary = await mkdtemp(join(tmpdir(), "modif-motion-lifecycle-"));
assert.equal(resolve(dirname(temporary)), resolve(tmpdir()), "Fixture cleanup must stay inside the OS temporary directory");
await writeFile(join(temporary, "index.html"), '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:black"><div id="root"></div><script type="module" src="/harness.jsx"></script></body></html>');
await writeFile(join(temporary, "harness.jsx"), `
import React from ${JSON.stringify(`${project}/node_modules/react/index.js`)};
import { createRoot } from ${JSON.stringify(`${project}/node_modules/react-dom/client.js`)};
import { AnimationProvider, useAnimationSettings } from ${JSON.stringify(`${project}/src/contexts/AnimationContext.jsx`)};
import Dither from ${JSON.stringify(`${project}/src/components/Dither.jsx`)};
import Silk from ${JSON.stringify(`${project}/src/components/Silk.jsx`)};
import WarpText from ${JSON.stringify(`${project}/src/components/WarpText.jsx`)};
const root = createRoot(document.getElementById("root"));
let settings = { scene: new URLSearchParams(location.search).get("scene") || "dither", props: {} };
function Controls() {
    const { enabled, toggle } = useAnimationSettings();
    return <button id="toggle-motion" style={{ position: "fixed", right: 0, bottom: 0, zIndex: 20 }} onClick={toggle}>{enabled ? "Pause" : "Resume"}</button>;
}
window.renderMotion = (patch = {}) => {
    settings = { ...settings, ...patch };
    const Scene = { dither: Dither, silk: Silk, warp: WarpText }[settings.scene];
    const props = settings.scene === "warp" ? { text: "TEXT TOOLS", fontSize: 72, fontFamily: "Georgia, serif", style: { height: 220 }, ...settings.props } : settings.props;
    root.render(<AnimationProvider><Controls /><Scene key={settings.scene} {...props} /></AnimationProvider>);
};
window.renderMotion();
`);
await build({ configFile: false, root: temporary, publicDir: false, plugins: [react()],
    resolve: { alias: { react: `${project}/node_modules/react`, "react-dom": `${project}/node_modules/react-dom` } },
    logLevel: "error", build: { outDir: join(temporary, "dist"), emptyOutDir: true } });
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
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

function instrumentMotion() {
    const records = [], wrapped = new WeakSet();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
        const gl = getContext.apply(this, args);
        if (!gl || !String(args[0]).includes("webgl") || wrapped.has(gl)) return gl;
        wrapped.add(gl);
        const record = { canvas: this, draws: 0, uniforms: {} }, names = new WeakMap();
        records.push(record);
        const getLocation = gl.getUniformLocation;
        gl.getUniformLocation = function (program, name) {
            const location = getLocation.call(this, program, name);
            if (location) names.set(location, name);
            return location;
        };
        for (const method of ["uniform1f", "uniform2f", "uniform3f", "uniform1i", "uniform2fv", "uniform3fv"]) {
            const original = gl[method];
            gl[method] = function (location, ...values) {
                const name = location && names.get(location);
                if (name) record.uniforms[name] = typeof values[0] === "number" ? values : Array.from(values[0]);
                return original.call(this, location, ...values);
            };
        }
        for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
            const original = gl[method];
            if (!original) continue;
            gl[method] = function (...values) { record.draws++; return original.apply(this, values); };
        }
        return gl;
    };
    window.motionSnapshot = (uniform) => {
        const record = records.filter((item) => item.canvas.isConnected && item.uniforms[uniform]).at(-1);
        return record ? { draws: record.draws, uniforms: record.uniforms, width: record.canvas.width } : null;
    };
}

const snapshot = (page, uniform) => page.evaluate((name) => window.motionSnapshot(name), uniform);
async function expectAnimating(page, uniform) {
    await page.waitForFunction((name) => window.motionSnapshot(name), uniform);
    const before = await snapshot(page, uniform);
    await page.waitForFunction(({ name, before }) => {
        const current = window.motionSnapshot(name);
        return current?.draws > before.draws + 3 && current.uniforms[name][0] > before.uniforms[name][0];
    }, { name: uniform, before }, { timeout: 20000 });
}
async function expectFrozen(page, uniform) {
    // R3F may invalidate a final demand frame when its props change.
    await page.waitForTimeout(300);
    const before = await snapshot(page, uniform);
    assert.ok(before, "Paused shader must still have a rendered canvas");
    await page.waitForTimeout(250);
    const after = await snapshot(page, uniform);
    assert.equal(after.draws, before.draws, "Paused shaders must stop GPU drawing");
    assert.deepEqual(after.uniforms[uniform], before.uniforms[uniform], "Shader time must freeze");
    assert.ok(await page.evaluate(() => window.preservedCanvas === document.querySelector("canvas")), "Pause must preserve the same canvas");
}

try {
    const context = await browser.newContext({ viewport: { width: 900, height: 650 }, reducedMotion: "no-preference" });
    await context.addInitScript(instrumentMotion);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(harnessURL);
    for (const [scene, uniform] of [["dither", "time"], ["silk", "uTime"], ["warp", "uTime"]]) {
        await page.evaluate((scene) => window.renderMotion({ scene, props: {} }), scene);
        await expectAnimating(page, uniform);
        await page.evaluate(() => { window.preservedCanvas = document.querySelector("canvas"); });
        await page.locator("#toggle-motion").click();
        await expectFrozen(page, uniform);
        if (scene === "dither") {
            await page.evaluate(() => window.renderMotion({ props: { waveFrequency: 6 } }));
            await page.waitForFunction(() => window.motionSnapshot("time")?.uniforms.waveFrequency[0] === 6);
        } else if (scene === "silk") {
            await page.evaluate(() => window.renderMotion({ props: { color1: "#00ff00", color2: "#ff0000" } }));
            await page.waitForFunction(() => window.motionSnapshot("uTime")?.uniforms.uColor1.join(",") === "0,1,0");
        } else {
            const draws = (await snapshot(page, uniform)).draws;
            await page.evaluate(() => window.renderMotion({ props: { text: "IMAGE TOOLS" } }));
            await page.waitForFunction((draws) => window.motionSnapshot("uTime")?.draws > draws, draws);
            assert.equal(await page.locator(".warp-text").getAttribute("aria-label"), "IMAGE TOOLS");
            assert.equal(await page.locator(".warp-text > span").count(), 0, "WebGL canvas should replace only the fallback text");
        }
        await expectFrozen(page, uniform);
        await page.locator("#toggle-motion").click();
        await expectAnimating(page, uniform);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expectFrozen(page, uniform);
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await expectAnimating(page, uniform);
        await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
        await expectFrozen(page, uniform);
        await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
        await expectAnimating(page, uniform);
    }
    await page.evaluate(() => window.renderMotion({ scene: "dither", props: { disableAnimation: true } }));
    await page.waitForFunction(() => window.motionSnapshot("time"));
    await page.evaluate(() => { window.preservedCanvas = document.querySelector("canvas"); });
    await expectFrozen(page, "time");
    assert.deepEqual(errors, []);
    await context.close();

    const reduced = await browser.newContext({ reducedMotion: "reduce" });
    await reduced.addInitScript(instrumentMotion);
    const still = await reduced.newPage();
    await still.goto(`${harnessURL}/?scene=silk`);
    await still.waitForFunction(() => window.motionSnapshot("uTime"));
    await still.evaluate(() => { window.preservedCanvas = document.querySelector("canvas"); });
    await expectFrozen(still, "uTime");
    await still.emulateMedia({ reducedMotion: "no-preference" });
    await expectAnimating(still, "uTime");
    await reduced.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
    await mobile.addInitScript(instrumentMotion);
    const touch = await mobile.newPage();
    await touch.goto(harnessURL);
    for (const [scene, uniform] of [["dither", "time"], ["silk", "uTime"], ["warp", "uTime"]]) {
        await touch.evaluate((scene) => window.renderMotion({ scene, props: {} }), scene);
        await expectAnimating(touch, uniform);
        assert.equal((await snapshot(touch, uniform)).width, 390, `${scene} should cap coarse-pointer DPR at 1`);
    }
    await mobile.close();

    const fallback = await browser.newContext();
    await fallback.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) { return String(type).includes("webgl") ? null : getContext.call(this, type, ...args); };
    });
    const unsupported = await fallback.newPage();
    await unsupported.goto(`${harnessURL}/?scene=warp`);
    await unsupported.locator(".warp-text > span").waitFor();
    assert.equal(await unsupported.locator(".warp-text > span").textContent(), "TEXT TOOLS");
    await fallback.close();
    console.log("Motion lifecycle passed: preserved canvases, stopped GPU draws/time, pause/resume, live reduced motion, hidden tabs, paused prop updates, initial static resume, mobile DPR, Dither opt-out, and readable WarpText fallback.");
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(temporary, { recursive: true, force: true });
}
