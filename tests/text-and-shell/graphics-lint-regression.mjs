// Build the app and skeleton first. Preview them at MODIF_BASE_URL (4173 by
// default) and MODIF_SKELETON_BASE_URL (4184). PLAYWRIGHT_MODULE may point to an
// external Playwright install. The component harness is built only in OS temp.
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve, join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href : "playwright");
const project = resolve(import.meta.dirname, "../..").replaceAll("\\", "/");
const temporary = await mkdtemp(join(tmpdir(), "modif-graphics-regression-"));
const imports = [
    ["MainDither", "src/components/Dither.jsx"],
    ["SkeletonDither", "skeleton/src/components/Dither.jsx"],
    ["SkeletonSilk", "skeleton/src/components/Silk.jsx"],
    ["MainCursor", "src/components/TargetCursor.jsx"],
    ["SkeletonCursor", "skeleton/src/components/TargetCursor.jsx"],
].map(([name, path]) => `import ${name} from ${JSON.stringify(`${project}/${path}`)};`).join("\n");
await writeFile(join(temporary, "index.html"), '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/harness.jsx"></script></body></html>');
await writeFile(join(temporary, "harness.jsx"), `
import React from ${JSON.stringify(`${project}/node_modules/react/index.js`)};
import { createRoot } from ${JSON.stringify(`${project}/node_modules/react-dom/client.js`)};
${imports}
document.body.style.margin = "0";
document.body.style.cursor = "crosshair";
let settings = { scene: "main-dither", cursor: null, props: {} };
const root = createRoot(document.getElementById("root"));
window.renderGraphics = (patch = {}) => {
    settings = { ...settings, ...patch };
    const Scene = { "main-dither": MainDither, "skeleton-dither": SkeletonDither, silk: SkeletonSilk }[settings.scene];
    const Cursor = { main: MainCursor, skeleton: SkeletonCursor }[settings.cursor];
    root.render(<React.StrictMode>{Scene ? <Scene {...settings.props} /> : null}{Cursor ? <Cursor hideDefaultCursor /> : null}<button className="cursor-target" style={{position:"fixed", top:20,left:20}}>Hover target</button></React.StrictMode>);
};
window.unmountGraphics = () => root.render(null);
window.renderGraphics();
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

function instrumentWebGL() {
    const records = [];
    const wrapped = new WeakSet();
    const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
        const gl = originalContext.apply(this, args);
        if (!gl || !String(args[0]).includes("webgl") || wrapped.has(gl)) return gl;
        wrapped.add(gl);
        const record = { gl, canvas: this, draws: 0, uniforms: {}, colors: new Set(), signatures: new Set() };
        records.push(record);
        const names = new WeakMap();
        const wavePrograms = new WeakMap();
        const lookup = gl.getUniformLocation;
        gl.getUniformLocation = function (program, name) {
            const location = lookup.call(this, program, name);
            if (!wavePrograms.has(program)) wavePrograms.set(program, this.getAttachedShaders(program).some((shader) => this.getShaderSource(shader).includes("uniform float waveFrequency")));
            if (location) names.set(location, name === "resolution" && wavePrograms.get(program) ? "waveResolution" : name);
            return location;
        };
        for (const method of ["uniform1f", "uniform2f", "uniform3f", "uniform1i", "uniform2fv", "uniform3fv"]) {
            const original = gl[method];
            gl[method] = function (location, ...values) {
                const name = location && names.get(location);
                if (name) {
                    const sample = typeof values[0] === "number" ? values : Array.from(values[0]);
                    const previous = record.uniforms[name];
                    record.uniforms[name] = { first: previous?.first || sample, last: sample, count: (previous?.count || 0) + 1 };
                }
                return original.call(this, location, ...values);
            };
        }
        for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
            const original = gl[method];
            if (!original) continue;
            gl[method] = function (...values) {
                const result = original.apply(this, values);
                record.draws += 1;
                if (record.draws % 10 === 0 && !this.getParameter(this.FRAMEBUFFER_BINDING)) {
                    const signature = [];
                    for (let y = 1; y <= 4; y += 1) for (let x = 1; x <= 4; x += 1) {
                        const pixel = new Uint8Array(4);
                        this.readPixels(Math.floor(this.drawingBufferWidth * x / 5), Math.floor(this.drawingBufferHeight * y / 5), 1, 1, this.RGBA, this.UNSIGNED_BYTE, pixel);
                        const color = Array.from(pixel.slice(0, 3)).join(",");
                        record.colors.add(color);
                        signature.push(color);
                    }
                    record.signatures.add(signature.join(";"));
                }
                return result;
            };
        }
        return gl;
    };
    window.graphicsSnapshot = (uniform) => records.filter((record) => record.canvas.isConnected && record.uniforms[uniform]).map((record) => ({
        width: record.canvas.width, height: record.canvas.height, draws: record.draws,
        cssWidth: record.canvas.getBoundingClientRect().width, cssHeight: record.canvas.getBoundingClientRect().height,
        uniforms: record.uniforms, colorCount: record.colors.size, frameVariants: record.signatures.size,
        hasNonblackPixels: [...record.colors].some((color) => color !== "0,0,0"),
    }));
}

async function assertAnimated(page, uniform) {
    try {
        await page.waitForFunction((name) => {
            const record = window.graphicsSnapshot(name).at(-1);
            return record && record.draws > 20 && record.colorCount > 2 && record.hasNonblackPixels && record.frameVariants > 1 && record.uniforms[name].last[0] > record.uniforms[name].first[0];
        }, uniform, { timeout: 20000 });
    } catch (error) {
        console.log(JSON.stringify({ failedGraphics: page.url(), uniform, records: await page.evaluate((name) => window.graphicsSnapshot(name), uniform) }));
        throw error;
    }
    return (await page.evaluate((name) => window.graphicsSnapshot(name), uniform)).at(-1);
}

try {
    // Exercise the shipped production apps, not only the isolated harness.
    for (const [url, uniform] of [[process.env.MODIF_BASE_URL || "http://127.0.0.1:4173", "time"], [process.env.MODIF_SKELETON_BASE_URL || "http://127.0.0.1:4184", "uTime"]]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        await context.addInitScript(instrumentWebGL);
        const page = await context.newPage();
        const errors = []; page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await assertAnimated(page, uniform);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction((name) => window.graphicsSnapshot(name).some((record) => record.width >= 370 && record.width <= 390 && record.height > 700 && Math.abs(record.width - record.cssWidth) <= 1 && Math.abs(record.height - record.cssHeight) <= 1), uniform);
        await assertAnimated(page, uniform);
        assert.deepEqual(errors, []);
        await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(instrumentWebGL);
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(harnessURL);
    for (const scene of ["main-dither", "skeleton-dither"]) {
        await page.evaluate((scene) => window.renderGraphics({ scene, cursor: null, props: { waveColor: [0.5, 0.4, 0.8] } }), scene);
        await assertAnimated(page, "time");
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => window.graphicsSnapshot("time").at(-1)?.uniforms.waveResolution.last.join(",") === "390,844");
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.waitForFunction(() => window.graphicsSnapshot("time").at(-1)?.uniforms.waveResolution.last.join(",") === "1440,1000");
    }
    await page.evaluate(() => window.renderGraphics({ scene: "silk", props: { speed: 5, color: "#7B7481", scale: 1 } }));
    await assertAnimated(page, "uTime");
    await page.evaluate(() => window.renderGraphics({ props: { speed: 2, scale: 1.7, color: "#ff0000", noiseIntensity: 0.4, rotation: 0.6, lightMode: true } }));
    await page.waitForFunction(() => {
        const record = window.graphicsSnapshot("uTime").at(-1), uniforms = record?.uniforms;
        return uniforms?.uSpeed.last[0] === 2 && uniforms.uScale.last[0] === 1.7 && uniforms.uNoiseIntensity.last[0] === 0.4 && uniforms.uRotation.last[0] === 0.6 && uniforms.uLightMode.last[0] === 1 && uniforms.uColor.last.join(",") === "1,0,0";
    });
    await assertAnimated(page, "uTime");
    for (const cursor of ["main", "skeleton"]) {
        for (let cycle = 0; cycle < 2; cycle += 1) {
            await page.evaluate((cursor) => window.renderGraphics({ scene: null, cursor }), cursor);
            await page.waitForFunction(() => document.body.style.cursor === "none" && document.body.classList.contains("target-cursor-active"));
            await page.getByRole("button", { name: "Hover target" }).hover();
            await page.evaluate(() => window.unmountGraphics());
            await page.waitForFunction(() => document.body.style.cursor === "crosshair" && !document.body.classList.contains("target-cursor-active"));
            assert.equal(await page.locator(".target-cursor-wrapper").count(), 0);
        }
    }
    assert.deepEqual(errors, []);
    await context.close();
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const touch = await touchContext.newPage();
    const touchErrors = []; touch.on("pageerror", (error) => touchErrors.push(error.message));
    await touch.goto(harnessURL);
    for (const cursor of ["main", "skeleton"]) {
        await touch.evaluate((cursor) => window.renderGraphics({ scene: null, cursor }), cursor);
        await touch.getByRole("button", { name: "Hover target" }).tap();
        assert.equal(await touch.locator(".target-cursor-wrapper").count(), 0);
        assert.equal(await touch.evaluate(() => document.body.style.cursor), "crosshair");
        assert.equal(await touch.evaluate(() => document.body.classList.contains("target-cursor-active")), false);
    }
    assert.deepEqual(touchErrors, []);
    await touchContext.close();
    console.log("Production app/skeleton WebGL pixels, animation and resizing; both Dither resolution updates; Silk material prop/time updates; both cursor cleanup cycles passed");
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    assert.ok(resolve(temporary).startsWith(join(resolve(tmpdir()), "modif-graphics-regression-")));
    await rm(temporary, { recursive: true, force: true });
}
