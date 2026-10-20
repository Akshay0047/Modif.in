# Cold-cache performance audit

The original live deployment was measured before changing application code. The final deployed comparison is pending until its entry asset is verified and the correctness browsers have stopped.

## Measurement method

- Serial Microsoft Edge/Chromium lab runs, with a new isolated browser context for every route and trial. HTTP cache is cleared and disabled through CDP; service workers are blocked and bypassed. Every retained case includes explicit memory/disk/service-worker/prefetch cache checks.
- Desktop uses 1440×900 at normal CPU/network speed. Mobile emulation uses 390×844, a 4× CPU slowdown, 1.6 Mbps download, 750 Kbps upload and 150 ms latency. This simulates a slower device and connection; it is not a physical-phone measurement.
- The seven routes are Home, Text, Image, Docs, Text Counter, Compress Image and PDF Merger. The complete sweep has one sample for each route/profile. Home and PDF Merger also have three mobile trials for median/range comparisons.
- Normal motion stays enabled. A five-second animation-frame sample begins when useful route controls appear. Controlled search typing, text input and animation controls are measured afterward, following a bounded network-idle wait.
- FCP, pre-interaction LCP, session-window CLS, long tasks and Event Timing entries are retained. The blocking-time proxy sums work over 50 ms between FCP and the first synthetic interaction; it is not an official TTI-bounded TBT result. Input-to-second-animation-frame measurements and Event Timing maxima are lab diagnostics, not field INP.
- Request waterfalls include origin/type breakdowns and decoded/encoded sizes. CDP transfer counts are used when available. Completed worker entries that hand off away from the page CDP session use Resource Timing's encoded body plus its standard 300-byte header estimate; raw values and the fallback are identified.
- Browser HTTP-cache coldness does not establish cold DNS, TLS, CDN, OS or GPU/shader caches. Headless rendering can use a software GPU. Server/network variance remains material even when the browser cache is empty.

## Baseline evidence

The local source reference before changes was `4474d3a`; the observed live entry was `/assets/index-BQ9Sd-hs.js`. The original page did not expose a Git SHA. Raw artifacts are kept locally under `.git/performance/live-baseline` and `.git/performance/live-repeat-baseline` and are excluded from source commits.

- Home's original desktop sample transferred 706,600 bytes across 20 requests: 478,922 first-party bytes, 180,706 bytes for Google Tag Manager, 45,744 font bytes and the remaining requests. FCP was 788 ms, useful search controls painted at 1,030 ms and LCP was 1,204 ms.
- That five-second home frame sample had a 30.8 ms p95 interval, a 218.2 ms maximum interval and seven intervals over 50 ms. These describe the measured lab run; they do not establish a device-independent frame rate.
- Original mobile home medians across three trials: useful controls painted at 3,573 ms, LCP 3,568 ms, 707,101 encoded response bytes, a 1,068 ms blocking proxy and a 249.5 ms p95 input-to-second-frame diagnostic.
- Original mobile PDF Merger medians across three trials: useful controls painted at 6,832 ms, LCP 6,580 ms and 1,233,973 encoded response bytes. Useful-control time ranged from 5,415 to 9,695 ms, illustrating why payload changes are more stable evidence than a single timing sample.
- PDF Merger downloaded the document worker before any upload: 302,694 encoded body bytes / 836,110 decoded bytes. Its observed transfer estimate includes the standard Resource Timing header allowance.
- The original mobile hub samples recorded roughly 0.130332 CLS. The shift source was the in-flow footer moving as the lazy route replaced its loading content; Text Counter and Compress Image also showed smaller shifts from the same source.
- All 14 initial cases and all six repeated cases passed their cold HTTP-cache proofs. The repeated home profiles exposed a profiler node-preview serialization bug for text-node layout-shift sources. It was fixed and fixture-checked; CLS from those affected repeat samples must be excluded. Other raw metric streams remain available. The original hub shift records used element nodes and remain valid.

## Changes and final comparison

Pending final deployment verification and quiet live AFTER measurements. Preserve the Reactbits effects while evaluating the measured payload, startup, interaction and layout improvements. Record the final asset fingerprint, exact sample counts, byte breakdowns, timing medians/ranges and any remaining limitations here before marking this section complete.

## Build identity across Windows and Linux

The first production update was confirmed by GitHub's successful Production deployment for commit `6346ae7f3a997376013c549c463ea0165353a0c9` (deployment `7204896267`). Its live entry was `/assets/index-DNsEfKDu.js`; the local Windows build emitted `/assets/index-C0hH9PCb.js`.

The strict entry-path/SHA helper correctly reported a mismatch. Inspection found 447 extra escaped carriage returns before literal newlines in the local bundle, from imported raw legal Markdown. Those account for its 894 extra bytes. After accounting only for those CRLF differences and generated asset fingerprints, the initial entry contents matched. Shared code's carriage-return expressions were retained in this check. The raw hashes, byte counts, exact normalization and deployment metadata are retained in `.git/performance/deploy-initial/build-identity.json`.

This corroboration is distinct from an exact file-hash match. Canonical entry content alone cannot establish the contents of every referenced chunk. A final cross-platform comparison therefore also needs the authoritative Production deployment commit and direct checks of the changed loading boundaries. No application text or legal documents are reformatted merely to force identical output hashes.

## Reproduce

Run the public baseline or deployed comparison serially, with correctness tests and other profilers stopped:

```powershell
node scripts/profile-performance.mjs --base-url https://modif.in --output .git/performance/live-after
node scripts/profile-performance.mjs --base-url https://modif.in --routes /,/doc/pdf-merger --profiles mobile4g --runs 3 --output .git/performance/live-repeat-after
node scripts/compare-performance.mjs --before .git/performance/live-baseline --after .git/performance/live-after --output .git/performance/comparison-full
node scripts/compare-performance.mjs --before .git/performance/live-repeat-baseline --after .git/performance/live-repeat-after --output .git/performance/comparison-repeat
```

After building and pushing, verify the served entry against the local build with at most three read-only checks:

```powershell
node scripts/profile-performance.mjs --verify-deploy --base-url https://modif.in --checks 3 --output .git/performance/deployment-final
```

This checks the entry path and SHA-256, triggers no deployment and schedules no follow-up work.
