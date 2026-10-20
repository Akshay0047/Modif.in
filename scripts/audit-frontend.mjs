/**
 * Audit every real app route on a running production preview.
 * Usage: npm run audit:frontend -- --routes /,/text --output <directory>
 * MODIF_BASE_URL and BROWSER_CHANNEL have the same meaning as the browser tests.
 * Reports/screenshots default to the operating system's temporary directory.
 */
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const argumentsList = process.argv.slice(2);
const option = (name, fallback) => {
    const index = argumentsList.indexOf(`--${name}`);
    const inline = argumentsList.find((argument) => argument.startsWith(`--${name}=`));
    return inline?.slice(name.length + 3) ?? (index >= 0 ? argumentsList[index + 1] : fallback);
};
const baseURL = process.env.MODIF_BASE_URL || "http://127.0.0.1:4173";
const output = resolve(option("output", join(tmpdir(), "modif-in-frontend-audit", new Date().toISOString().replace(/[:.]/g, "-"))));
const workerCount = Math.max(1, Math.min(4, Number(option("workers", "2")) || 2));
const screenshotMode = option("screenshots", "failures");
const routeFilter = option("routes", "")?.split(",").filter(Boolean);
const viewports = [
    { name: "desktop", width: 1440, height: 900, axe: true },
    { name: "mobile", width: 390, height: 844, axe: true },
    { name: "narrow", width: 320, height: 740, axe: false },
];

async function collectRoutes() {
    const routes = ["/", "/text", "/image", "/doc"];
    for (const [module, prefix] of Object.entries({ text: "text", image: "image", docs: "doc" })) {
        const directory = join(root, "src", "modules", module);
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
            try {
                await access(join(directory, entry.name, "index.jsx"));
                routes.push(`/${prefix}/${entry.name}`);
            } catch {
                // Supporting folders without a route entry are intentionally omitted.
            }
        }
    }
    return routes.filter((route) => !routeFilter.length || routeFilter.includes(route)).sort();
}

function addFinding(result, type, message, detail) {
    result.findings.push({ type, message, ...(detail ? { detail } : {}) });
}

async function inspectLayout(page) {
    return page.evaluate(() => {
        const visible = (element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 2 && rect.height > 2 && style.visibility !== "hidden"
                && style.display !== "none" && !element.closest('[aria-hidden="true"], [inert]');
        };
        const identify = (element) => ({
            tag: element.tagName.toLowerCase(),
            id: element.id,
            className: typeof element.className === "string" ? element.className : "",
            text: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 100),
        });
        const viewportWidth = document.documentElement.clientWidth;
        const clippedControls = [...document.querySelectorAll("a[href], button, input:not([type='hidden']), select, textarea")]
            .filter(visible)
            .filter((element) => {
                const rect = element.getBoundingClientRect();
                if (rect.left >= -1 && rect.right <= viewportWidth + 1) return false;
                // A deliberately scrollable code/table/control panel owns its overflow.
                for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                    const style = getComputedStyle(parent);
                    if (["auto", "scroll"].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1) return false;
                }
                return true;
            })
            .map((element) => {
                const rect = element.getBoundingClientRect();
                return { ...identify(element), left: rect.left, right: rect.right, width: rect.width };
            });
        return {
            title: document.title,
            h1: [...document.querySelectorAll("h1")].filter((element) => {
                const style = getComputedStyle(element);
                return style.visibility !== "hidden" && style.display !== "none"
                    && !element.closest('[aria-hidden="true"], [inert]');
            }).map((element) => element.textContent.trim()),
            mainCount: [...document.querySelectorAll('main, [role="main"]')].filter(visible).length,
            viewportWidth,
            documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            clippedControls,
            inputCount: document.querySelectorAll("input, select, textarea").length,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        };
    });
}

async function inspectFooter(page) {
    const footer = page.locator("footer").last();
    if (!await footer.count()) return { present: false };
    await footer.scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    return footer.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const controls = [...element.querySelectorAll("a[href], button")].map((control) => {
            const box = control.getBoundingClientRect();
            const center = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return {
                text: (control.textContent || control.getAttribute("aria-label") || "").trim(),
                visible: box.width > 0 && box.height > 0 && box.left >= -1 && box.right <= innerWidth + 1
                    && box.top >= -1 && box.bottom <= innerHeight + 1,
                unobscured: center === control || control.contains(center),
                hitTarget: center?.outerHTML.slice(0, 240) ?? null,
            };
        });
        return { present: true, visible: rect.top < innerHeight && rect.bottom > 0, controls };
    });
}

async function inspectRoute(page, route, viewport) {
    const result = { route, viewport: viewport.name, findings: [], pageErrors: [], failedRequests: [] };
    const origin = new URL(baseURL).origin;
    const onPageError = (error) => result.pageErrors.push(error.message);
    const onResponse = (response) => {
        if (response.url().startsWith(`${origin}/`) && response.status() >= 400) {
            result.failedRequests.push({ url: response.url(), status: response.status() });
        }
    };
    const onRequestFailed = (request) => {
        if (request.url().startsWith(`${origin}/`) && request.failure()?.errorText !== "net::ERR_ABORTED") {
            result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
        }
    };
    page.on("pageerror", onPageError);
    page.on("response", onResponse);
    page.on("requestfailed", onRequestFailed);
    const started = performance.now();
    try {
        const response = await page.goto(new URL(route, baseURL).href, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (!response?.ok()) addFinding(result, "http", `Route returned HTTP ${response?.status() ?? "unknown"}`);
        await page.waitForFunction(() => {
            const root = document.getElementById("root");
            return root?.textContent.trim().length > 20
                && ![...root.querySelectorAll("h1")].some((heading) => heading.textContent.startsWith("Loading page"));
        }, undefined, { timeout: 20000 });
        await page.locator(".intro-screen").waitFor({ state: "hidden", timeout: 5000 });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        result.loadMilliseconds = Math.round(performance.now() - started);
        result.layout = await inspectLayout(page);
        if (result.layout.h1.length !== 1) addFinding(result, "heading", `Expected one accessible H1; found ${result.layout.h1.length}`);
        if (result.layout.mainCount !== 1) addFinding(result, "landmark", `Expected one main landmark; found ${result.layout.mainCount}`);
        if (result.layout.documentWidth > result.layout.viewportWidth + 1) addFinding(result, "overflow", `Document width ${result.layout.documentWidth}px exceeds viewport ${result.layout.viewportWidth}px`);
        if (result.layout.clippedControls.length) addFinding(result, "clipped-control", "Interactive controls extend beyond the viewport without a horizontal scroll owner", result.layout.clippedControls);
        if (/Page could not load|Page not found/.test(result.layout.title)) addFinding(result, "route-error", result.layout.title);
        // Snapshot before axe injects and scans; its own long tasks are not app cost.
        result.metrics = await page.evaluate(() => ({
            navigation: performance.getEntriesByType("navigation").map((entry) => ({ domContentLoaded: entry.domContentLoadedEventEnd, transferSize: entry.transferSize })),
            longTasks: window.__frontendAuditLongTasks || [],
        }));

        if (viewport.axe && !argumentsList.includes("--no-axe")) {
            const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
            result.axe = {
                passes: accessibility.passes.length,
                incomplete: accessibility.incomplete.map(({ id, nodes }) => ({ id, count: nodes.length })),
                violations: accessibility.violations.map(({ id, impact, description, helpUrl, nodes }) => ({
                    id, impact, description, helpUrl,
                    nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
                })),
            };
            for (const violation of result.axe.violations) addFinding(result, "accessibility", `${violation.id}: ${violation.nodes.length} affected element(s)`, violation);
        }

        result.footer = await inspectFooter(page);
        if (!result.footer.present || !result.footer.visible) addFinding(result, "footer", "Footer is missing or unreachable by scrolling");
        const obscured = result.footer.controls?.filter((control) => !control.visible || !control.unobscured) ?? [];
        if (obscured.length) addFinding(result, "footer-control", "Footer controls are clipped or obscured", obscured);
        await page.evaluate(() => window.scrollTo(0, 0));
    } catch (error) {
        addFinding(result, "audit-error", error.message);
    } finally {
        page.off("pageerror", onPageError);
        page.off("response", onResponse);
        page.off("requestfailed", onRequestFailed);
    }
    if (result.pageErrors.length) addFinding(result, "page-error", "Uncaught runtime errors", result.pageErrors);
    if (result.failedRequests.length) addFinding(result, "resource-error", "Same-origin resources failed to load", result.failedRequests);
    if (screenshotMode === "all" || (screenshotMode !== "none" && (result.findings.length || ["/", "/text", "/image", "/doc"].includes(route)))) {
        const fileName = `${viewport.name}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "--")}.png`;
        try {
            await page.screenshot({ path: join(output, fileName), fullPage: true, animations: "disabled", timeout: 15000 });
            result.screenshot = fileName;
        } catch (error) {
            result.screenshotError = error.message;
        }
    }
    return result;
}

const routes = await collectRoutes();
if (!routes.length) throw new Error("No matching routes. Use comma-separated actual app paths with --routes.");
await mkdir(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), baseURL, routes, viewports, workers: workerCount, results: [] };
let reportWrite = Promise.resolve();
console.log(`Auditing ${routes.length} routes at ${viewports.length} viewports. Report: ${join(output, "report.json")}`);
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
try {
    for (const viewport of viewports) {
        let index = 0;
        await Promise.all(Array.from({ length: workerCount }, async () => {
            const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", isMobile: viewport.name !== "desktop", hasTouch: viewport.name !== "desktop" });
            await context.addInitScript(() => {
                window.__frontendAuditLongTasks = [];
                try {
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) window.__frontendAuditLongTasks.push({ startTime: entry.startTime, duration: entry.duration });
                    }).observe({ type: "longtask", buffered: true });
                } catch {
                    // Long-task observation is an optional diagnostic, never a pass criterion.
                }
            });
            const page = await context.newPage();
            try {
                while (index < routes.length) {
                    const route = routes[index++];
                    const result = await inspectRoute(page, route, viewport);
                    report.results.push(result);
                    console.log(`${viewport.name} ${route}: ${result.findings.length ? `${result.findings.length} finding(s)` : "passed"}`);
                    const snapshot = JSON.stringify(report, null, 2);
                    reportWrite = reportWrite.then(() => writeFile(join(output, "report.json"), snapshot));
                    await reportWrite;
                }
            } finally {
                await context.close();
            }
        }));
    }
} finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    report.results.sort((a, b) => a.viewport.localeCompare(b.viewport) || a.route.localeCompare(b.route));
    report.summary = {
        routeCount: routes.length,
        routeViewportCount: report.results.length,
        passed: report.results.filter((result) => !result.findings.length).length,
        failed: report.results.filter((result) => result.findings.length).length,
        findings: report.results.reduce((count, result) => count + result.findings.length, 0),
        axeScans: report.results.filter((result) => result.axe).length,
        note: "Empty states only. Automated checks do not certify uploaded-file workflows, screen-reader behavior, physical devices, or calibrated performance.",
    };
    await mkdir(dirname(join(output, "report.json")), { recursive: true });
    await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.failed) process.exitCode = 1;
