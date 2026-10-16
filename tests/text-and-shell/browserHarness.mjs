import { pathToFileURL } from "node:url";

// Install playwright locally, or point PLAYWRIGHT_MODULE at an external install.
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : "playwright");

export const baseURL = process.env.MODIF_BASE_URL || "http://127.0.0.1:4173";

export async function withBrowser(run) {
    const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
    try {
        for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
            const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
            const page = await context.newPage();
            await run(page, context);
            await context.close();
        }
    } finally {
        await browser.close();
    }
}
