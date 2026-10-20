import assert from "node:assert/strict";
import test from "node:test";

async function fixture(id, { ready = false, idle = true } = {}) {
    const scripts = [], frames = [], idleTasks = [], timers = [];
    let observerCallback, disconnected = false;
    globalThis.document = {
        querySelector: (selector) => selector === "#main-content h1" ? ready : !ready,
        getElementById: () => ({}),
        createElement: () => ({}),
        head: { appendChild: (script) => scripts.push(script) },
    };
    globalThis.window = {
        ...(idle ? { requestIdleCallback: (callback, options) => idleTasks.push({ callback, options }) } : {}),
        setTimeout: (callback, delay) => timers.push({ callback, delay }),
    };
    globalThis.requestAnimationFrame = (callback) => frames.push(callback);
    globalThis.MutationObserver = class {
        constructor(callback) { observerCallback = callback; }
        observe() {}
        disconnect() { disconnected = true; }
    };
    const { loadAnalyticsAfterContent } = await import(`../../src/analytics/loadAnalytics.js?test=${id}`);
    return {
        load: loadAnalyticsAfterContent, scripts, frames, idleTasks, timers,
        showContent() { ready = true; observerCallback(); },
        get disconnected() { return disconnected; },
        cleanup() { for (const key of ["window", "document", "requestAnimationFrame", "MutationObserver"]) delete globalThis[key]; },
    };
}

test("analytics waits for actual route content, two paint frames, and idle time; route changes do not duplicate the SDK", async () => {
    const page = await fixture("wait");
    try {
        page.load("G-SFVEF88V33");
        page.load("G-SFVEF88V33");
        assert.equal(page.scripts.length, 0);
        assert.equal(page.frames.length, 0);
        page.showContent();
        assert.equal(page.disconnected, true);
        page.frames.shift()();
        assert.equal(page.idleTasks.length, 0);
        page.frames.shift()();
        assert.equal(page.scripts.length, 0);
        assert.equal(page.idleTasks[0].options.timeout, 3000);
        page.idleTasks.shift().callback();
        assert.equal(page.scripts.length, 1);
        assert.match(page.scripts[0].src, /gtag\/js\?id=G-SFVEF88V33$/);
        assert.equal(page.scripts[0].fetchPriority, "low");
        page.load("G-SFVEF88V33");
        assert.equal(page.scripts.length, 1);
    } finally { page.cleanup(); }
});

test("analytics loads after a timer on browsers without requestIdleCallback", async () => {
    const page = await fixture("fallback", { ready: true, idle: false });
    try {
        page.load("G-SFVEF88V33");
        page.frames.shift()();
        page.frames.shift()();
        assert.equal(page.scripts.length, 0);
        assert.equal(page.timers[0].delay, 1000);
        page.timers[0].callback();
        assert.equal(page.scripts.length, 1);
    } finally { page.cleanup(); }
});
