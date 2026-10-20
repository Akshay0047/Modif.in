/** Compare retained lab observations; never opens a browser or requests a URL. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { completeWorkerTransfers, summarize } from "./profile-performance.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const beforeDirectory = option("before", "");
const afterDirectory = option("after", "");
if (!beforeDirectory || !afterDirectory) {
  throw new Error(
    "Usage: node scripts/compare-performance.mjs --before <directory> --after <directory> [--output <directory>]",
  );
}
const output = resolve(option("output", ".git/performance/comparison"));
const readReport = async (directory) =>
  JSON.parse(await readFile(resolve(directory, "report.json"), "utf8"));
const beforeReport = await readReport(beforeDirectory);
const afterReport = await readReport(afterDirectory);
for (const report of [beforeReport, afterReport]) {
  for (const result of report.results) {
    completeWorkerTransfers(result);
    result.summary = summarize(result);
  }
}
const round = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const statistics = (values, digits = 2) => {
  const usable = values.filter(Number.isFinite);
  return {
    samples: usable.length,
    median: round(median(usable), digits),
    min: round(Math.min(...usable), digits),
    max: round(Math.max(...usable), digits),
  };
};
const change = (before, after, digits = 2) => ({
  before,
  after,
  delta:
    Number.isFinite(before.median) && Number.isFinite(after.median)
      ? round(after.median - before.median, digits)
      : null,
  changePercent:
    Number.isFinite(before.median) &&
    Number.isFinite(after.median) &&
    before.median !== 0
      ? round((after.median / before.median - 1) * 100)
      : null,
});
const legacyNodeObserverFailure = (report, result) =>
  (report.instrumentationVersion || 0) < 3 &&
  result.pageErrors?.some((error) =>
    error.includes("Cannot read properties of undefined (reading 'slice')"),
  );
const metricValue = (result, metric) =>
  metric === "frameP95Ms"
    ? result.summary.frames?.p95Ms
    : result.summary[metric];
const metrics = [
  "encodedTransferBytes",
  "completedBeforeInteractionBytes",
  "completedBeforeUsefulControlsBytes",
  "fcpMs",
  "lcpMs",
  "contentReadyAfterPaintMs",
  "blockingTimeProxyMs",
  "longestTaskMs",
  "inputSecondFrameP95Ms",
  "labEventTimingMaxMs",
  "frameP95Ms",
  "cls",
];
const keyOf = (result) => `${result.profile} ${result.route}`;
const keys = [
  ...new Set([...beforeReport.results, ...afterReport.results].map(keyOf)),
].sort();

function payloadBreakdown(before, after, field) {
  const source = (result, report) => {
    const values = {};
    for (const [key, value] of Object.entries(result.summary[field] || {})) {
      const label =
        field === "byOrigin" && key === new URL(report.baseURL).origin
          ? "first-party"
          : key;
      values[label] = (values[label] || 0) + value.encodedTransferBytes;
    }
    return values;
  };
  const beforeValues = before.map((result) => source(result, beforeReport));
  const afterValues = after.map((result) => source(result, afterReport));
  const labels = [
    ...new Set([...beforeValues, ...afterValues].flatMap(Object.keys)),
  ].sort();
  return labels.map((label) => ({
    label,
    ...change(
      statistics(beforeValues.map((values) => values[label] || 0)),
      statistics(afterValues.map((values) => values[label] || 0)),
    ),
  }));
}

function largestRequests(results) {
  if (!results.length) return [];
  const medianBytes = median(
    results.map((result) => result.summary.encodedTransferBytes),
  );
  const representative = [...results].sort(
    (a, b) =>
      Math.abs(a.summary.encodedTransferBytes - medianBytes) -
      Math.abs(b.summary.encodedTransferBytes - medianBytes),
  )[0];
  return [...representative.requests]
    .sort((a, b) => b.encodedTransferBytes - a.encodedTransferBytes)
    .slice(0, 10)
    .map(
      ({
        url,
        type,
        encodedTransferBytes,
        decodedBodyBytes,
        transferSource,
      }) => ({
        url,
        type,
        encodedTransferBytes,
        decodedBodyBytes,
        transferSource,
      }),
    );
}

const comparison = {
  createdAt: new Date().toISOString(),
  beforeDirectory: resolve(beforeDirectory),
  afterDirectory: resolve(afterDirectory),
  beforeBaseURL: beforeReport.baseURL,
  afterBaseURL: afterReport.baseURL,
  note: "Descriptive serial lab comparisons, not field INP/CrUX or a statistical significance claim. Bytes are observed encoded responses; worker Resource Timing fallbacks include a standard header estimate. Single samples are explicitly retained as single samples. DNS, TLS, CDN, GPU and OS caches can vary. Compare live-to-live timings where possible.",
  results: [],
};
for (const key of keys) {
  const before = beforeReport.results.filter((result) => keyOf(result) === key);
  const after = afterReport.results.filter((result) => keyOf(result) === key);
  const profile = (before[0] || after[0]).profile;
  const warnings = [];
  if (!before.length || !after.length)
    warnings.push("This case has no matching observation on one side.");
  if (before.length < 3 || after.length < 3)
    warnings.push(
      "Fewer than three samples on one or both sides; timing changes are descriptive.",
    );
  if (beforeReport.baseURL !== afterReport.baseURL)
    warnings.push(
      "Origins differ; server/CDN/network timing is not controlled between the two sides.",
    );
  if (
    JSON.stringify(
      beforeReport.profiles?.find((entry) => entry.name === profile),
    ) !==
    JSON.stringify(
      afterReport.profiles?.find((entry) => entry.name === profile),
    )
  )
    warnings.push(
      "Profile settings differ; do not treat timing deltas as a controlled comparison.",
    );
  if ([...before, ...after].some((result) => !result.cacheProof?.verified))
    warnings.push("One or more cold-cache proofs failed or are missing.");
  if (
    [...before, ...after].some(
      (result) => result.summary.unfinishedFirstPartyRequests?.length,
    )
  )
    warnings.push(
      "Unfinished first-party requests remain at the observation boundary; affected total bytes are observed-window lower bounds. Completed-before-interaction bytes have their own cutoff.",
    );
  if (
    before.some((result) => legacyNodeObserverFailure(beforeReport, result)) ||
    after.some((result) => legacyNodeObserverFailure(afterReport, result))
  )
    warnings.push(
      "Known legacy node-preview observer error recorded; CLS from affected samples is excluded. Raw page-error records are preserved for review.",
    );
  const changes = {};
  for (const metric of metrics) {
    const precision = metric === "cls" ? 6 : 2;
    const usable = (report, results) =>
      results
        .filter(
          (result) =>
            metric !== "cls" || !legacyNodeObserverFailure(report, result),
        )
        .map((result) => metricValue(result, metric));
    changes[metric] = change(
      statistics(usable(beforeReport, before), precision),
      statistics(usable(afterReport, after), precision),
      precision,
    );
  }
  comparison.results.push({
    key,
    beforeSamples: before.length,
    afterSamples: after.length,
    allColdCacheProofsVerified: [...before, ...after].every(
      (result) => result.cacheProof?.verified,
    ),
    warnings,
    unfinishedBeforeRequests: before.flatMap(
      (result) => result.summary.unfinishedFirstPartyRequests || [],
    ),
    unfinishedAfterRequests: after.flatMap(
      (result) => result.summary.unfinishedFirstPartyRequests || [],
    ),
    metrics: changes,
    payloadByOrigin: payloadBreakdown(before, after, "byOrigin"),
    payloadByType: payloadBreakdown(before, after, "byType"),
    largestBeforeRequests: largestRequests(before),
    largestAfterRequests: largestRequests(after),
  });
}
await mkdir(output, { recursive: true });
await writeFile(
  resolve(output, "comparison.json"),
  JSON.stringify(comparison, null, 2),
);
for (const result of comparison.results) {
  const bytes = result.metrics.encodedTransferBytes;
  const ready = result.metrics.contentReadyAfterPaintMs;
  console.log(
    `${result.key} (${result.beforeSamples}→${result.afterSamples} samples): bytes ${bytes.before.median}→${bytes.after.median} (${bytes.changePercent ?? "n/a"}%); ready ${ready.before.median}→${ready.after.median}ms; warnings=${result.warnings.length}`,
  );
}
console.log(`Comparison: ${resolve(output, "comparison.json")}`);
