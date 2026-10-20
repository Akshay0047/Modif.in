/**
 * Serial cold-browser-cache lab profiles, not field INP or CrUX data.
 * node scripts/profile-performance.mjs --base-url https://modif.in --runs 1
 * node scripts/profile-performance.mjs --routes /,/doc/pdf-merger --profiles mobile4g --runs 3
 * node scripts/profile-performance.mjs --summarize .git/performance/live-baseline
 * node scripts/profile-performance.mjs --verify-deploy --base-url https://modif.in --checks 3
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  const index = args.indexOf(`--${name}`);
  return (
    inline?.slice(name.length + 3) ?? (index >= 0 ? args[index + 1] : fallback)
  );
};
const baseURL = option(
  "base-url",
  process.env.MODIF_BASE_URL || "https://modif.in",
);
const output = resolve(
  option(
    "output",
    `.git/performance/${new Date().toISOString().replace(/[:.]/g, "-")}`,
  ),
);
const routes = option(
  "routes",
  "/,/text,/image,/doc,/text/text-counter,/image/compress-image,/doc/pdf-merger",
).split(",");
const selectedProfiles = option("profiles", "desktop,mobile4g").split(",");
const runs = Math.max(1, Math.min(10, Number(option("runs", "1")) || 1));
const profiles = [
  {
    name: "desktop",
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    cpuRate: 1,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  },
  // Explicit simulated Slow 4G: 1.6 Mbps down / 750 Kbps up / 150 ms latency.
  {
    name: "mobile4g",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    cpuRate: 4,
    latency: 150,
    downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8,
  },
].filter((profile) => selectedProfiles.includes(profile.name));
const round = (value) =>
  Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const percentile = (values, fraction) =>
  values.length
    ? [...values].sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)
      ]
    : null;
const readySelector = (route) =>
  route === "/"
    ? ".hero-search input"
    : ["/text", "/image", "/doc"].includes(route)
      ? ".search-bar__input"
      : route === "/text/text-counter"
        ? "#text-counter-input"
        : route.startsWith("/image/")
          ? ".img-tool__dropzone"
          : ".doc-tool-dropzone";

function installObservers({ selector }) {
  const record = (window.__performanceProfile = {
    readyMs: null,
    readyAfterPaintMs: null,
    paints: [],
    lcp: [],
    shifts: [],
    longTasks: [],
    events: [],
    inputs: [],
  });
  const observe = (type, target, transform, options = {}) => {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) target.push(transform(entry));
      }).observe({ type, buffered: true, ...options });
    } catch {
      record.unsupported = [...(record.unsupported || []), type];
    }
  };
  observe("paint", record.paints, (entry) => ({
    name: entry.name,
    startTime: entry.startTime,
  }));
  observe("largest-contentful-paint", record.lcp, (entry) => ({
    startTime: entry.startTime,
    renderTime: entry.renderTime,
    loadTime: entry.loadTime,
    size: entry.size,
    url: entry.url,
    element: entry.element?.outerHTML.slice(0, 300),
  }));
  observe("layout-shift", record.shifts, (entry) => ({
    startTime: entry.startTime,
    value: entry.value,
    hadRecentInput: entry.hadRecentInput,
    sources: entry.sources?.map((source) =>
      source.node?.outerHTML.slice(0, 200),
    ),
  }));
  observe("longtask", record.longTasks, (entry) => ({
    startTime: entry.startTime,
    duration: entry.duration,
    name: entry.name,
  }));
  observe(
    "event",
    record.events,
    (entry) => ({
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      processingStart: entry.processingStart,
      processingEnd: entry.processingEnd,
      interactionId: entry.interactionId,
    }),
    { durationThreshold: 16 },
  );
  document.addEventListener(
    "input",
    (event) => {
      const startTime = performance.now();
      const input = {
        target: event.target.id || event.target.className,
        startTime,
        inputToSecondAnimationFrameMs: null,
      };
      record.inputs.push(input);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          input.inputToSecondAnimationFrameMs = performance.now() - startTime;
        }),
      );
    },
    { capture: true },
  );
  const check = () => {
    if (record.readyMs != null) return;
    const element = document.querySelector(selector);
    if (!element || !element.getBoundingClientRect().width) return;
    record.readyMs = performance.now();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        record.readyAfterPaintMs = performance.now();
      }),
    );
  };
  const observer = new MutationObserver(check);
  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", check, { once: true });
}

async function measureFrames(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const values = [];
        let first;
        let previous;
        const frame = (time) => {
          first ??= time;
          if (previous !== undefined) values.push(time - previous);
          previous = time;
          if (time - first >= 5000)
            resolve({ startedAt: first, endedAt: time, intervalsMs: values });
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
}

async function interactions(page, route) {
  const result = [];
  const search = page.locator(".search-bar__input");
  if (await search.count()) {
    const query =
      route === "/text" ? "case" : route === "/doc" ? "pdf" : "compress";
    await search.focus();
    const startedAt = await page.evaluate(() => performance.now());
    await search.pressSequentially(query, { delay: 30 });
    await page
      .locator(".search-dropdown-menu")
      .waitFor({ state: "visible", timeout: 10000 });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    result.push({
      type: "search-typing",
      query,
      startedAt,
      completedAt: await page.evaluate(() => performance.now()),
      note: "Includes deliberately paced keystrokes; use per-input and Event Timing entries for latency.",
    });
    await page
      .getByRole("button", { name: "Clear search", exact: true })
      .click();
  } else if (route === "/text/text-counter") {
    const text = "Cold cache performance sample with ordinary words. ".repeat(
      250,
    );
    const startedAt = await page.evaluate(() => performance.now());
    await page.locator("#text-counter-input").fill(text);
    await page.waitForFunction(
      () =>
        document.querySelector(".text-tool-stat__value")?.textContent !== "0",
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    result.push({
      type: "controlled-text-paste",
      characters: text.length,
      startedAt,
      completedAt: await page.evaluate(() => performance.now()),
    });
  }
  const motion = page.getByRole("button", {
    name: "Pause animation",
    exact: true,
  });
  if (await motion.count()) {
    const startedAt = await page.evaluate(() => performance.now());
    await motion.click();
    await page
      .getByRole("button", { name: "Resume animation", exact: true })
      .waitFor();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    result.push({
      type: "pause-animation",
      startedAt,
      completedAt: await page.evaluate(() => performance.now()),
    });
  }
  return result;
}

export function summarize(result) {
  const data = result.observation;
  if (!data) return {};
  const fcp = data.paints.find(
    (entry) => entry.name === "first-contentful-paint",
  )?.startTime;
  // Playwright fill() can change a large text area without a keydown that
  // finalizes LCP. Synthetic interaction content must not become load LCP.
  const lcp = data.lcp
    .filter((entry) => entry.startTime <= result.firstInteractionAt)
    .at(-1)?.startTime;
  let cls = 0;
  let session = 0;
  let sessionStart = 0;
  let previous = 0;
  for (const shift of data.shifts.filter((entry) => !entry.hadRecentInput)) {
    if (
      shift.startTime - previous > 1000 ||
      shift.startTime - sessionStart > 5000
    ) {
      session = 0;
      sessionStart = shift.startTime;
    }
    session += shift.value;
    cls = Math.max(cls, session);
    previous = shift.startTime;
  }
  const loadLongTasks = data.longTasks.filter(
    (entry) =>
      entry.startTime >= (fcp ?? 0) &&
      entry.startTime < result.firstInteractionAt,
  );
  const byOrigin = {};
  const byType = {};
  for (const request of result.requests) {
    let origin;
    try {
      origin = new URL(request.url).origin;
    } catch {
      origin = "unknown";
    }
    for (const [group, key] of [
      [byOrigin, origin],
      [byType, request.type || "Other"],
    ]) {
      group[key] ??= {
        requests: 0,
        encodedTransferBytes: 0,
        decodedBodyBytes: 0,
      };
      group[key].requests += 1;
      group[key].encodedTransferBytes += request.encodedTransferBytes || 0;
      group[key].decodedBodyBytes += request.decodedBodyBytes || 0;
    }
  }
  return {
    fcpMs: round(fcp),
    lcpMs: round(lcp),
    cls: Number(cls.toFixed(6)),
    contentReadyMs: round(data.readyMs),
    contentReadyAfterPaintMs: round(data.readyAfterPaintMs),
    blockingTimeProxyMs: round(
      loadLongTasks.reduce(
        (sum, task) => sum + Math.max(0, task.duration - 50),
        0,
      ),
    ),
    longTaskCountBeforeInteraction: loadLongTasks.length,
    longestTaskMs: round(
      Math.max(0, ...loadLongTasks.map((task) => task.duration)),
    ),
    inputSecondFrameP95Ms: round(
      percentile(
        data.inputs
          .map((input) => input.inputToSecondAnimationFrameMs)
          .filter(Number.isFinite),
        0.95,
      ),
    ),
    labEventTimingMaxMs: round(
      Math.max(0, ...data.events.map((event) => event.duration)),
    ),
    frames: result.frames
      ? {
          durationMs: round(result.frames.endedAt - result.frames.startedAt),
          count: result.frames.intervalsMs.length,
          medianMs: round(percentile(result.frames.intervalsMs, 0.5)),
          p95Ms: round(percentile(result.frames.intervalsMs, 0.95)),
          maxMs: round(Math.max(0, ...result.frames.intervalsMs)),
          intervalsOver50ms: result.frames.intervalsMs.filter(
            (value) => value > 50,
          ).length,
        }
      : null,
    requestCount: result.requests.length,
    encodedTransferBytes: result.requests.reduce(
      (sum, request) => sum + (request.encodedTransferBytes || 0),
      0,
    ),
    byOrigin,
    byType,
  };
}

export function completeWorkerTransfers(result) {
  // A worker main-script request can leave the page CDP session before its
  // response/finish events arrive. Same-origin Resource Timing still records
  // the completed worker entry. transferSize includes a standardized 300-byte
  // header estimate, so preserve that distinction from CDP's transfer count.
  for (const request of result.requests) {
    if (request.encodedTransferBytes || request.error) continue;
    const resource = result.observation?.resources?.find(
      (entry) => entry.name === request.url && entry.transferSize > 0,
    );
    if (!resource) continue;
    request.encodedTransferBytes = resource.transferSize;
    request.encodedBodyBytes = resource.encodedBodySize;
    request.decodedBodyBytes = resource.decodedBodySize;
    request.endMs ??= round(resource.responseEnd);
    request.status ??= resource.responseStatus;
    request.transferSource = "resource-timing-with-300-byte-header-estimate";
    request.resourceTiming = resource;
  }
  result.transferAccounting = {
    resourceTimingFallbacks: result.requests.filter(
      (request) => request.transferSource,
    ).length,
    note: "CDP encodedDataLength where available; completed worker entries use Resource Timing encoded body plus its standard 300-byte header estimate. Raw source values are retained.",
  };
}

const resultFilename = (result) =>
  `${result.profile}-${result.route === "/" ? "home" : result.route.slice(1).replaceAll("/", "--")}${result.run > 1 || result.multipleRuns ? `-run-${result.run || 1}` : ""}.json`;

function aggregate(results) {
  const groups = new Map();
  for (const result of results) {
    const key = `${result.profile} ${result.route}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(result);
  }
  return [...groups].map(([key, samples]) => {
    const metric = (name) => {
      const values = samples
        .map((sample) => sample.summary?.[name])
        .filter(Number.isFinite);
      return {
        median: round(percentile(values, 0.5)),
        min: round(Math.min(...values)),
        max: round(Math.max(...values)),
      };
    };
    return {
      key,
      samples: samples.length,
      allCacheProofsVerified: samples.every(
        (sample) => sample.cacheProof?.verified,
      ),
      fcpMs: metric("fcpMs"),
      lcpMs: metric("lcpMs"),
      contentReadyAfterPaintMs: metric("contentReadyAfterPaintMs"),
      encodedTransferBytes: metric("encodedTransferBytes"),
      blockingTimeProxyMs: metric("blockingTimeProxyMs"),
      inputSecondFrameP95Ms: metric("inputSecondFrameP95Ms"),
    };
  });
}

async function verifyDeployment() {
  const directory = resolve(option("dist-dir", "dist"));
  const html = await readFile(resolve(directory, "index.html"), "utf8");
  const entryFrom = (source) =>
    [...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)]
      .map((match) => match[1])
      .find((path) => path.startsWith("/assets/") && path.endsWith(".js"));
  const expectedEntry = entryFrom(html);
  if (!expectedEntry)
    throw new Error(
      "No bundled /assets/*.js entry found in local dist/index.html",
    );
  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const expectedSha256 = hash(
    await readFile(resolve(directory, expectedEntry.slice(1))),
  );
  const checks = Math.max(1, Math.min(3, Number(option("checks", "3")) || 3));
  const delayMs = Math.max(
    0,
    Math.min(15000, Number(option("check-delay-ms", "15000")) || 0),
  );
  const report = {
    baseURL,
    expectedEntry,
    expectedSha256,
    checks: [],
    note: "Bounded read-only deployment checks. Matching entry path and SHA256 confirms the served entry matches the local build; no deployment is triggered.",
  };
  await mkdir(output, { recursive: true });
  for (let attempt = 1; attempt <= checks; attempt += 1) {
    const check = {
      attempt,
      checkedAt: new Date().toISOString(),
      matched: false,
    };
    try {
      const response = await fetch(new URL("/", baseURL), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15000),
      });
      check.status = response.status;
      check.etag = response.headers.get("etag");
      check.liveEntry = entryFrom(await response.text());
      if (response.ok && check.liveEntry === expectedEntry) {
        const entryResponse = await fetch(new URL(check.liveEntry, baseURL), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(15000),
        });
        check.entryStatus = entryResponse.status;
        check.liveSha256 = hash(Buffer.from(await entryResponse.arrayBuffer()));
        check.matched = entryResponse.ok && check.liveSha256 === expectedSha256;
      }
    } catch (error) {
      check.error = error.message;
    }
    report.checks.push(check);
    await writeFile(
      resolve(output, "deployment-verification.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `Deployment check ${attempt}/${checks}: ${check.matched ? "entry path and SHA256 match local build" : `not matched (${check.liveEntry || check.error || check.status})`}`,
    );
    if (check.matched) break;
    if (attempt < checks) await delay(delayMs);
  }
  if (!report.checks.some((check) => check.matched))
    console.log(
      "Deployment did not match within the bounded checks; no later action is scheduled.",
    );
}

async function profileRoute(browser, route, profile) {
  const result = {
    route,
    profile: profile.name,
    url: new URL(route, baseURL).href,
    startedAt: new Date().toISOString(),
    requests: [],
    pageErrors: [],
    errors: [],
  };
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.isMobile,
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const network = new Map();
  const cacheEvents = [];
  const playwrightRequests = [];
  const pendingSizes = [];
  let navigationTimestamp;
  let navigationWallTime;
  context.on("request", (request) =>
    playwrightRequests.push({
      request,
      url: request.url(),
      type: request.resourceType(),
      startedAt: Date.now(),
    }),
  );
  context.on("requestfinished", (request) => {
    pendingSizes.push(
      (async () => {
        const record = playwrightRequests.find(
          (entry) => entry.request === request,
        );
        if (!record) return;
        record.sizes = await request.sizes();
        record.timing = request.timing();
        record.response = await request.response();
      })().catch(() => {}),
    );
  });
  page.on("pageerror", (error) => result.pageErrors.push(error.message));
  cdp.on("Network.requestWillBeSent", (event) => {
    if (navigationTimestamp === undefined && event.type === "Document") {
      navigationTimestamp = event.timestamp;
      navigationWallTime = event.wallTime * 1000;
    }
    const record = {
      id: event.requestId,
      url: event.request.url,
      method: event.request.method,
      type: event.type,
      startMs: round(
        (event.timestamp - (navigationTimestamp ?? event.timestamp)) * 1000,
      ),
      initiator: event.initiator?.type,
      encodedTransferBytes: 0,
      decodedBodyBytes: 0,
    };
    if (event.redirectResponse)
      record.redirectFrom = event.redirectResponse.url;
    network.set(event.requestId, record);
  });
  cdp.on("Network.requestServedFromCache", (event) =>
    cacheEvents.push(event.requestId),
  );
  cdp.on("Network.responseReceived", (event) => {
    const record = network.get(event.requestId);
    if (!record) return;
    Object.assign(record, {
      status: event.response.status,
      mimeType: event.response.mimeType,
      responseMs: round((event.timestamp - navigationTimestamp) * 1000),
      fromDiskCache: Boolean(event.response.fromDiskCache),
      fromServiceWorker: Boolean(event.response.fromServiceWorker),
      fromPrefetchCache: Boolean(event.response.fromPrefetchCache),
      protocol: event.response.protocol,
      responseTiming: event.response.timing,
      serverCache: event.response.headers?.["x-vercel-cache"],
      contentEncoding: event.response.headers?.["content-encoding"],
    });
  });
  cdp.on("Network.dataReceived", (event) => {
    const record = network.get(event.requestId);
    if (record) record.decodedBodyBytes += event.dataLength;
  });
  cdp.on("Network.loadingFinished", (event) => {
    const record = network.get(event.requestId);
    if (record)
      Object.assign(record, {
        endMs: round((event.timestamp - navigationTimestamp) * 1000),
        encodedTransferBytes: event.encodedDataLength,
      });
  });
  cdp.on("Network.loadingFailed", (event) => {
    const record = network.get(event.requestId);
    if (record) record.error = event.errorText;
  });
  try {
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.setBypassServiceWorker", { bypass: true });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuRate });
    if (profile.latency)
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: profile.latency,
        downloadThroughput: profile.downloadThroughput,
        uploadThroughput: profile.uploadThroughput,
        connectionType: "cellular4g",
      });
    await context.addInitScript(installObservers, {
      selector: readySelector(route),
    });
    const documentResponse = await page.goto(result.url, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    result.document = {
      status: documentResponse?.status(),
      url: documentResponse?.url(),
      headers: await documentResponse?.allHeaders(),
    };
    await page.waitForFunction(
      () => window.__performanceProfile?.readyAfterPaintMs != null,
      undefined,
      { timeout: 120000 },
    );
    result.frames = await measureFrames(page);
    try {
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    } catch {
      result.errors.push(
        "Network did not become idle within 30 seconds; request totals may include unfinished resources.",
      );
    }
    result.firstInteractionAt = await page.evaluate(() => performance.now());
    result.interactions = await interactions(page, route);
    result.observation = await page.evaluate(() => ({
      ...window.__performanceProfile,
      navigation: performance
        .getEntriesByType("navigation")
        .map((entry) => entry.toJSON()),
      resources: performance
        .getEntriesByType("resource")
        .map((entry) => entry.toJSON()),
      endedAt: performance.now(),
    }));
    result.environment = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      devicePixelRatio,
      viewport: { width: innerWidth, height: innerHeight },
      visibilityState: document.visibilityState,
      timeOrigin: performance.timeOrigin,
    }));
    await Promise.allSettled(pendingSizes);
    result.requests = [...network.values()].filter((request) =>
      /^https?:/.test(request.url),
    );
    // Context-level requests can expose dedicated-worker imports absent from the page CDP target.
    const seenByUrl = new Map();
    for (const request of result.requests)
      seenByUrl.set(request.url, (seenByUrl.get(request.url) || 0) + 1);
    for (const request of playwrightRequests) {
      if (!/^https?:/.test(request.url)) continue;
      const seen = seenByUrl.get(request.url) || 0;
      if (seen) {
        seenByUrl.set(request.url, seen - 1);
        continue;
      }
      result.requests.push({
        url: request.url,
        type: request.type,
        source: "playwright-context-supplement",
        startMs: round(
          (request.timing?.startTime ?? request.startedAt) - navigationWallTime,
        ),
        endMs: round(
          (request.timing?.startTime ?? request.startedAt) -
            navigationWallTime +
            (request.timing?.responseEnd ?? 0),
        ),
        encodedTransferBytes:
          (request.sizes?.responseBodySize || 0) +
          (request.sizes?.responseHeadersSize || 0),
        decodedBodyBytes: null,
        status: request.response?.status(),
        fromServiceWorker: request.response?.fromServiceWorker(),
      });
    }
    result.requests.sort((a, b) => a.startMs - b.startMs);
    completeWorkerTransfers(result);
    result.cacheProof = {
      freshIsolatedContext: true,
      cacheCleared: true,
      cacheDisabled: true,
      bypassServiceWorker: true,
      serviceWorkersBlocked: true,
      servedFromCacheEvents: cacheEvents.length,
      diskCacheHits: result.requests.filter((request) => request.fromDiskCache)
        .length,
      serviceWorkerHits: result.requests.filter(
        (request) => request.fromServiceWorker,
      ).length,
      prefetchCacheHits: result.requests.filter(
        (request) => request.fromPrefetchCache,
      ).length,
      contextSupplementCount: result.requests.filter(
        (request) => request.source,
      ).length,
    };
    result.cacheProof.verified =
      cacheEvents.length === 0 &&
      result.cacheProof.diskCacheHits === 0 &&
      result.cacheProof.serviceWorkerHits === 0 &&
      result.cacheProof.prefetchCacheHits === 0;
    result.summary = summarize(result);
  } catch (error) {
    result.errors.push(error.message);
  } finally {
    result.finishedAt = new Date().toISOString();
    await context.close();
  }
  return result;
}

async function main() {
  if (args.includes("--verify-deploy")) return verifyDeployment();
  const summarizePath = option("summarize", "");
  if (summarizePath) {
    const directory = resolve(summarizePath);
    const report = JSON.parse(
      await readFile(resolve(directory, "report.json"), "utf8"),
    );
    for (const result of report.results) {
      completeWorkerTransfers(result);
      result.summary = summarize(result);
      await writeFile(
        resolve(directory, resultFilename(result)),
        JSON.stringify(result, null, 2),
      );
    }
    report.derivedMetricsRecomputedAt = new Date().toISOString();
    report.summaryVersion = 2;
    report.aggregates = aggregate(report.results);
    await writeFile(
      resolve(directory, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `Recomputed ${report.results.length} profiles from retained raw observations; no browser measurements rerun.`,
    );
    return;
  }
  await mkdir(output, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    summaryVersion: 2,
    baseURL,
    profiles,
    routes,
    runs,
    note: "Serial lab observations, not field INP/CrUX or a physical mobile device. Cold browser HTTP cache is cleared/disabled and service workers bypassed; DNS, TLS, GPU/shader, OS and CDN caches are not certified cold. TBT proxy spans FCP to the first synthetic interaction, not a measured TTI window. Animation uses the normal user preference. WebGL in headless Chromium may use a software GPU.",
    results: [],
  };
  console.log(
    `Serial cold-cache profiles: ${routes.length} routes × ${profiles.length} profiles × ${runs} run(s). ${output}`,
  );
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "msedge",
    headless: true,
  });
  try {
    for (const profile of profiles) {
      for (let run = 1; run <= runs; run += 1) {
        for (const route of routes) {
          const result = await profileRoute(browser, route, profile);
          result.run = run;
          result.multipleRuns = runs > 1;
          report.results.push(result);
          const summary = result.summary || {};
          console.log(
            `${profile.name} ${route} run${run}: FCP=${summary.fcpMs ?? "n/a"}ms LCP=${summary.lcpMs ?? "n/a"}ms ready=${summary.contentReadyAfterPaintMs ?? "n/a"}ms bytes=${summary.encodedTransferBytes ?? "n/a"} blocking-proxy=${summary.blockingTimeProxyMs ?? "n/a"}ms frame-p95=${summary.frames?.p95Ms ?? "n/a"}ms cold=${result.cacheProof?.verified ?? false}${result.errors.length ? ` errors=${result.errors.length}` : ""}`,
          );
          await writeFile(
            resolve(output, resultFilename(result)),
            JSON.stringify(result, null, 2),
          );
          report.aggregates = aggregate(report.results);
          await writeFile(
            resolve(output, "report.json"),
            JSON.stringify(report, null, 2),
          );
        }
      }
    }
  } finally {
    await browser.close();
    report.finishedAt = new Date().toISOString();
    await writeFile(
      resolve(output, "report.json"),
      JSON.stringify(report, null, 2),
    );
  }
  if (
    report.results.some(
      (result) =>
        !result.cacheProof?.verified ||
        result.errors.length ||
        result.pageErrors.length,
    )
  )
    console.log(
      "Some cases require review; noisy timing values do not cause a failure exit.",
    );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
