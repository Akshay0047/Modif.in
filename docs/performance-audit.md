# Cold-cache performance audit

The original and updated public deployments were measured on 20 October 2026 with empty browser HTTP caches. The updated deployment preserves the Reactbits effects. Three mobile trials reduced median useful-control time from 3,573 to 2,060 ms on Home and from 6,832 to 2,911 ms on PDF Merger; Merger's observed encoded responses fell 70.09%. These are descriptive lab results, not field INP or a guarantee for every device or connection.

These measurements describe the frozen source below, before the subsequent branded page-loading cover. Current profiler version 5 records controls as ready only after the cover is hidden and their inert lock is released; it does not count controls mounted behind the cover as usable. Rerun the profiler when comparing current reveal times rather than treating the historical values as measurements of the new loading screen.

## Measurement method

- Serial Microsoft Edge/Chromium lab runs, with a new isolated browser context for every route and trial. HTTP cache is cleared and disabled through CDP; service workers are blocked and bypassed. Every retained case includes explicit memory/disk/service-worker/prefetch cache checks.
- Desktop uses 1440×900 at normal CPU/network speed. Mobile emulation uses 390×844, a 4× CPU slowdown, 1.6 Mbps download, 750 Kbps upload and 150 ms latency. This simulates a slower device and connection; it is not a physical-phone measurement.
- The seven routes are Home, Text, Image, Docs, Text Counter, Compress Image and PDF Merger. The complete sweep has one sample for each route/profile. Home and PDF Merger also have three mobile trials for median/range comparisons.
- Normal motion stays enabled. A five-second animation-frame sample begins when useful route controls appear. Controlled search typing, text input and animation controls are measured afterward, following a bounded network-idle wait.
- FCP, pre-interaction LCP, session-window CLS, long tasks and Event Timing entries are retained. The blocking-time proxy sums work over 50 ms between FCP and the first synthetic interaction; it is not an official TTI-bounded TBT result. Input-to-second-animation-frame measurements and Event Timing maxima are lab diagnostics, not field INP.
- Request waterfalls include origin/type breakdowns and decoded/encoded sizes. CDP transfer counts are used when available. Completed worker entries that hand off away from the page CDP session use Resource Timing's encoded body plus its standard 300-byte header estimate; raw values and the fallback are identified.
- Completed-before-interaction bytes are separated from the total observation, which also includes controlled search and its deferred enhancement. This classifies whole responses using retained Resource/Navigation Timing and, where unavailable, CDP navigation-relative timestamps. It is not a byte-level streaming snapshot or a critical-path budget. Partial in-flight responses are excluded from the completed cutoff.
- The current profiler waits for actual request completion and a 500 ms quiet period after interaction, bounded at 30 seconds. Analytics collect beacons are retained in the waterfall but do not hold that boundary open. A previously fired Playwright `networkidle` lifecycle alone can resolve before a newly triggered dynamic import completes.
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

The final application source was frozen at `e452810c6e0d08cc6b6ef3c0b60d55f36c9dad9f`. Its successful GitHub Production deployment is [7205230421](https://github.com/Akshay0047/Modif.in/deployments); the public entry was `/assets/index-D-IWDSaV.js`. All correctness browsers and builds stopped before the live profiles ran serially.

The primary AFTER evidence is 14 route/profile cases plus six repeated mobile Home/Merger cases. All 20 passed cold-cache proofs and recorded zero application exceptions or observer errors. Five additional hub payload cases were retained: four completed supplements and an initial desktop completion diagnostic whose transfer was still incomplete. All 25 AFTER contexts passed cold-cache proofs. The original 20 BEFORE contexts also passed. Aborted zero-response Google Analytics collect requests remain visible in the raw logs; they are not application script failures.

The changes preserve Dither, Silk, DepthText, WarpText, TargetCursor and PixelCard. They reduce unnecessary work through Dither render settings, an OGL implementation of the existing Silk shader, capability-gated cursor loading, lazy search animation, deferred PDF/XLSX processing imports, self-hosted fonts, delayed low-priority analytics loading and stable loading layouts. Delayed file-processing imports retain source-generation/unmount/busy guards.

### Payload and request breakdown

The primary sweep's desktop Home total was essentially unchanged: 706,600 → 708,618 bytes (+0.29%). Mobile Home's three-trial median was 707,101 → 676,602 bytes (-4.31%). Effects and the analytics SDK still load within the observation; this work does not claim a large homepage session-payload reduction.

Before the first controlled interaction, completed Home responses were 706,600 → 666,506 bytes on desktop and a median 707,101 → 634,461 bytes on mobile. The later search enhancement accounts for approximately 42 KB of the difference from the full session totals. This phase includes the five-second animation sample and idle wait; it should not be described as bytes required to paint the first screen.

- Completed hub sessions, including the search enhancement, are approximately 444 KB on desktop and 412 KB on mobile, versus approximately 680 KB before. The completed supplements were desktop Docs 443,959 bytes and mobile Text/Image/Docs 411,944 / 411,914 / 411,942 bytes. Original desktop Text/Image were 443,938 / 443,943 bytes. The original desktop Docs and three mobile hub totals ended with an in-flight `AnimatedList` import and are explicitly lower bounds, not complete session sizes.
- Before search, hub completed-response totals were approximately 402 KB on desktop and 370 KB on mobile. Search still provides its functional suggestion list while the animated enhancement loads.
- Mobile Text Counter transferred 622,504 → 365,891 bytes (-41.22%); Compress Image transferred 630,209 → 374,134 bytes (-40.63%). Desktop values were 622,469 → 397,863 and 630,221 → 405,999 bytes respectively.
- Mobile PDF Merger's repeated total was 1,233,973 → 369,137 median bytes (-70.09%; AFTER range 369,110–369,138). First-party medians fell from 1,005,803 to 187,978 bytes; Google Tag Manager remained approximately 181 KB. Desktop Merger transferred 1,233,438 → 401,365 bytes (-67.46%).
- PDF Merger no longer fetches the 302,694-byte encoded document-worker body or the eager PDF processing libraries before a file needs them. The AFTER module-route requests contain the small Silk/OGL chunks, rather than the approximately 241 KB React Three Fiber dependency used by the previous Silk implementation. Mobile routes omit the approximately 31 KB cursor/GSAP chunk; desktop keeps the custom cursor.
- Home's largest remaining encoded responses were Dither approximately 263 KB, Google Tag Manager approximately 181 KB, the entry approximately 94 KB, the self-hosted Latin font approximately 46 KB and the deferred animated list approximately 42 KB. The desktop cursor chunk was approximately 31 KB. Google Fonts CSS/font origins are absent; the font bytes now come from the first-party origin. The original entry was approximately 127 KB.

### Timing, interaction and layout observations

Repeated mobile Home useful-control time improved from a median 3,573 ms (range 3,410–4,059) to 2,060 ms (1,997–2,069); LCP improved from 3,568 to 2,052 ms. The blocking proxy fell from 1,068 to 557 ms, the median largest pre-interaction long task from 372 to 238 ms and the per-run p95 input-to-second-frame median from 249.5 to 57 ms. The latter measures controlled search input; it is not field INP.

Repeated mobile Merger useful-control time improved from 6,832 ms (5,415–9,695) to 2,911 ms (1,891–5,984); LCP improved from 6,580 to 2,916 ms. The blocking proxy fell from 1,146 to 373 ms. The broad timing ranges remain material even though payload counts are stable.

All seven desktop primary cases showed earlier useful controls. Mobile Text, Docs and Text Counter also improved in their single samples. Mobile Image and Compress Image were slower in that sweep: Image useful controls 3,605 → 4,265 ms; Compress 3,320 → 4,820 ms, with FCP 2,284 → 4,528 ms. These mixed single-case results are retained rather than replaced with favorable timing reruns.

The retained Compress timeline shows a 527 ms DNS phase versus zero in its baseline, an entry request with a 1,953 ms CDP proxy phase before sending versus no such phase before, and entry completion at 4,135 versus 1,767 ms. Document server-wait time was approximately 50 versus 32 ms. Meanwhile, recorded pre-ready long-task duration fell from 1,254 to 344 ms. Connection/proxy delay therefore contributed to the slower sample; these observations do not establish a repeatable application-rendering regression or isolate every cause. Image also recorded longer DNS/connect and entry-response waits. Full diagnostic timelines are retained in `comparison-full/single-case-timing-diagnostics.json`.

Desktop Home's five-second frame interval p95 was 30.8 → 6.2 ms. Repeated mobile Home's per-run p95 median was 12.8 → 6.2 ms. Headless/high-refresh frame intervals do not establish physical-phone 60 fps or prove that no jitter can ever occur. Frame sampling and interactions remain bounded lab checks.

The three primary mobile hubs' CLS fell from approximately 0.130332 to zero; their desktop samples also recorded zero AFTER CLS. Mobile Text Counter and Compress Image recorded zero. Small footer shifts remain on Merger: the repeated mobile value was 0.009942 versus 0.003967 before, and some desktop tool samples recorded 0.002490. The claim is removal of the larger hub loading shift, not zero CLS everywhere. The affected legacy repeated Home CLS baseline is excluded as explained above.

The completed hub supplements validate payload completion only. They are not substituted into the primary timing comparison. Raw files and comparisons remain under `.git/performance/live-after`, `live-repeat-after`, `hub-payload-completion-*`, `comparison-full` and `comparison-repeat`; they are intentionally excluded from source commits.

## Build identity across Windows and Linux

The first production update was confirmed by GitHub's successful Production deployment for commit `6346ae7f3a997376013c549c463ea0165353a0c9` (deployment `7204896267`). Its live entry was `/assets/index-DNsEfKDu.js`; the local Windows build emitted `/assets/index-C0hH9PCb.js`.

The strict entry-path/SHA helper correctly reported a mismatch. Inspection found 447 extra escaped carriage returns before literal newlines in the local bundle, from imported raw legal Markdown. Those account for its 894 extra bytes. After accounting only for those CRLF differences and generated asset fingerprints, the initial entry contents matched. Shared code's carriage-return expressions were retained in this check. The raw hashes, byte counts, exact normalization and deployment metadata are retained in `.git/performance/deploy-initial/build-identity.json`.

This corroboration is distinct from an exact file-hash match. Canonical entry content alone cannot establish the contents of every referenced chunk. A final cross-platform comparison therefore also needs the authoritative Production deployment commit and direct checks of the changed loading boundaries. No application text or legal documents are reformatted merely to force identical output hashes.

The final strict verifier also correctly reported a mismatch across its three bounded checks. Local `/assets/index-bdSrqt1W.js` was 296,176 bytes with raw SHA-256 `ccb8d1f9c70ff0e621c9fdcebcc95c539decb8c09ea8d218f7dee0fe18589c63`; live `/assets/index-D-IWDSaV.js` was 295,282 bytes with raw SHA-256 `73372af6e38a1311467e7b33a9da3d32193256fe74b6af0cefeb074ab6cb55a6`. The same 447 escaped legal-text CRLF differences account for 894 bytes. Applying only the documented CRLF/fingerprint normalization produced matching entry SHA-256 `8eab91f45ed7d01b2d70a6004acaf5ee6f9af5b970a1e78f631064442043e068`.

That result is corroborated by successful Production deployment `7205230421` for the exact frozen commit, public self-hosted font preload and capability-gated cursor code, distinct public TargetCursor/Silk chunks, and the measured request boundaries. The deployment URL was `https://modif-hjzacg2bv-asckiii.vercel.app`. Raw hashes, narrow normalization and chunk fingerprints are retained in `.git/performance/deployment-final/build-identity.json`; exact verification output remains in `deployment-verification.json`. This is explicit cross-platform corroboration, not an assertion that the raw files are identical.

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
