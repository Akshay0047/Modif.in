# Frontend audit — 20 October 2026

The production build at `2715c18` passed every route in the automated responsive/accessibility sweep. The homepage, three hubs, and 114 implemented tool pages remain in the existing MODIF.in visual system.

## Coverage and results

- **118 routes × three viewports = 354 passing checks:** 1440×900 desktop, 390×844 mobile, and 320×740 narrow mobile.
- **236 axe scans** with WCAG 2 A/AA, 2.1 A/AA, and 2.2 AA tags reported no violations. These cover rendered empty states; canvas/glass contrast still needs manual assessment.
- No uncaught page errors, failed same-origin resources, horizontal page overflow, clipped controls, missing/duplicate page H1s, inaccessible footer controls, or missing main landmarks in that sweep.
- Targeted browser tests cover search keyboard/pointer/IME behavior, label activation and conditional fields, upload keyboard access, selected-mode semantics, legal-dialog focus/background inertness, signature placement/resize/rotation/export, processing outputs, and worker cancellation/retry.
- Graphics regressions verify real pixel changes, responsive canvas dimensions, current shader uniforms, retained canvases, paused rendering/time, resumed animation, live reduced motion, hidden tabs, coarse-pointer DPR, and WebGL title fallback.
- `npm test`: **61 passing Text/catalog unit tests**. `node --test tests/docs-and-image/*.test.mjs`: **41 passing unit tests**.
- Production build and project ESLint pass. The browser runner contains 21 Text/shell suites; Docs/Image has seven additional browser suites. See the commands below to reproduce them.

The route audit was run against a frozen production preview, not a hot-reloading development snapshot. Its report and 12 representative home/hub screenshots were saved locally under `.git/frontend-audit/final-verified/`; generated evidence is intentionally excluded from source control. The source inventory and checks are reproducible through `scripts/audit-frontend.mjs`.

## Changes made

- Persistent home/hub navigation, current-hub state, a skip link, visible focus, and one semantic page H1. The header keeps its layered DepthText treatment; decorative duplicate layers no longer create a visible-label/accessibility-name mismatch.
- Homepage search across all modules, six common-task shortcuts, and real PixelCard navigation links. Search preserves tools with the same slug in different hubs, has explicit clearing, and retains the existing keyboard/IME behavior.
- Eight curated Popular tools per hub, with one ordered source for flags and ordering. Full catalogs remain available, with category jump links in an accessible disclosure. [Rationale and sources](popular-tools.md) explain the editorial selection and lack of measured traffic rankings.
- Full wrapping tool names replace clipping and perpetual marquees. Ordinary document scrolling replaces desktop clipping; the footer stays in flow and legal dialogs fit the viewport, isolate the whole background, and restore focus/overflow.
- Labels for 31 unnamed visible/conditional controls; keyboard-operable uploads; native selected-state semantics; upload-first DOM/visual order; mobile touch/input sizing; wrapped filenames; readable Image action text; keyboard alternatives for signature manipulation.
- Dither, Silk, DepthText, WarpText, TargetCursor, and PixelCard remain. Motion defaults on, is user-pausable, respects reduced motion, and stops background work in hidden tabs. Paused shader canvases remain mounted and still. The unused hidden Silk scene no longer renders behind the homepage's Dither scene.
- The three homepage icon derivatives plus favicon dropped from approximately **3.21 MB to 30.5 KB** while preserving their source artwork. Originals remain in the repository. The entry JS chunk dropped from approximately **1.39 MB to 380 KB** decoded; the Reactbits renderer remains available through separate lazy scene chunks. This is an entry-chunk comparison, not total-page transfer or a measured Core Web Vitals improvement.

## Reproduce

```sh
npm ci
npm run lint
npm test
node --test tests/docs-and-image/*.test.mjs
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

In a second terminal, run the skeleton graphics fixture if using the full browser runner:

```sh
node node_modules/vite/bin/vite.js skeleton --host 127.0.0.1 --port 4184
```

Then run `npm run test:browser` and `npm run audit:frontend`. The seven `tests/docs-and-image/*.browser.mjs` suites run directly with Node. The default browser is installed Microsoft Edge; `MODIF_BASE_URL`, `MODIF_SKELETON_BASE_URL`, and `BROWSER_CHANNEL` can override the test targets/browser.

The graphics sampling assertion accepts a moving two-color dither palette. It still requires nonblack pixels, multiple changing frame signatures, actual GPU draws, and advancing shader time; counting a third sampled color was not a reliable animation check.

## Static review and limits

The audit used [Vercel's Web Interface Guidelines](https://vercel.com/design/guidelines), existing module patterns, and the maintained [design](../DESIGN.md) and [interaction](../UX-CONTRACT.md) contracts. The Impeccable detector's findings were reviewed: existing palette/size/radius variants and code-font fallbacks are intentional; progress-fill width transitions are bounded within their tracks and do not move surrounding controls. No native alert/confirm/prompt calls were found in application source.

`designmd lint DESIGN.md` returns zero errors; its advisory contrast warning treats the translucent Docs action fill without the actual dark backdrop, and orphan-token warnings reflect documentation of existing runtime styles rather than generated CSS.

The premium static scanner resolves all declared canonical owners. Its remaining heuristics flag 101 literal textareas for lacking an inline `resize-none` marker, and an unused legacy `.no-scrollbar` utility in AnimatedList CSS. Tool textareas inherit shared width/min-height/overflow rules and intentionally retain user-controlled vertical resizing for long input. Scrollbar styling is globally inherited from `src/index.css`; no current route opts into the unused hiding utility. These findings are recorded rather than misreported as a clean third-party static scan. The manifest scopes that scanner to UI-owner directories; route registration and metadata are checked by project tests.

Automated axe scans do not certify layered contrast, screen-reader behavior, every uploaded-file state, Safari/iOS behavior, physical mobile hardware, or all input sizes. The four-worker route sweep's timings include test contention; they are diagnostic observations, not calibrated FPS, INP, or device-performance guarantees. Large local file processing and third-party processing libraries retain their existing practical limits. No claim of universal zero latency or zero lag is made.

The merged-PR review and all 38 issue closures are recorded separately in [issue reconciliation](issue-reconciliation.md).

## Cold-cache performance follow-up

The subsequent production snapshot at `e452810` again passed **354/354 viewport checks and 236 axe scans**, with no findings. Its report and representative screenshots are retained locally under `.git/frontend-audit/performance-final/`. Desktop and mobile screenshots preserve the existing Dither, Silk, DepthText, WarpText, TargetCursor and PixelCard treatment.

The follow-up passed **63 Text/catalog/analytics unit tests and 45 Docs/Image unit tests**, the complete 22-suite Text/shell runner plus the new cursor-loading suite, and eight Docs/Image browser suites. The HEIC decoder interception suite uses the development server as documented; the other Docs/Image suites ran against production preview. After the final rebuild, PDF fallback and CSV export lifecycle checks passed again against production.

Additional regressions cover immediate search results with delayed/failed animation imports; absent idle document workers and Excel engines; first-party fonts; decoded idle-JavaScript budgets across seven representative routes; full fallback busy state; stale results after clear, reorder, replacement or navigation; and usable workspaces/native cursors when optional effect chunks fail. Graphics comparisons covered 18 frozen-pixel cases: Dither's buffer changes were bit-identical, and Silk's original shader on OGL differed by at most one channel value out of 255.

Project ESLint and the production build pass. The follow-up Impeccable scan reported four advisory findings for existing fluid type sizes; it also skipped the intentionally deleted, unused Silk-preview context. Design-system lint still has zero errors and the same 17 documented advisories. These static tools are not reported as clean accessibility certifications.

See the [cold-cache performance audit](performance-audit.md) for live deployment identity, before/after measurements, cache proofs, profiling commands and measurement limits.

## Branded page-loading cover

The loading-cover application snapshot at `f0d34b7` passed **354/354 viewport checks and 236 axe scans** on production preview. Reports and home/hub captures are retained locally under `.git/frontend-audit/loading-screen/routes/`; desktop/mobile loading-wordmark captures are in the parent folder.

The opaque cover is present in the initial HTML and appears immediately on pathname navigation. Its MODIF.in wordmark pulses while the actual page mounts underneath. The page reveals after committed route content, fonts, visible-image decoding, and the decorative background's first draw or handled failure, followed by a 200ms fade. Reduced-motion and paused-animation preferences keep the logo still. No minimum loading duration is imposed; failed entry and stalled route loads have bounded recovery.

The dedicated loader suite passed 18 desktop/mobile browser contexts covering entry-before-React, delayed Dither/Silk imports, route changes, failures, 404 recovery, keyboard isolation, reduced/paused motion, startup watchdogs, and legal-dialog history/overlapping inert ownership. It also verifies that the performance profiler does not report covered controls as usable. Shared legal-dialog, file-processing, and export workflows remain available after reveal.

The route and browser checks now await reveal before inspecting or typing into finished workspaces. Deliberately delayed loading, early title updates, and failure-recovery tests retain their distinct timing boundaries. Historical performance measurements remain explicitly tied to their earlier frozen snapshot; profiler version 5 includes the loading cover in its usable-control readiness condition.

Validation passed: production build, project ESLint, 65 Text/shared-lock unit tests, 45 Docs/Image unit tests, all 24 Text/shell browser suites across targeted/resumed batches, and all eight Docs/Image browser suites. The HEIC interception suite uses the development server; production preview serves the remaining Docs/Image checks. The graphics checks also use the separately running skeleton fixture.

Static checks introduce no loader findings. The premium scanner still reports the previously documented 101 textarea-resizing heuristics and one unused scrollbar utility; these unrelated contract differences are not misreported as a clean static scan. Design-system lint retains zero errors and 17 existing advisories.

## Shared translucent footer

The footer snapshot at `29b5b70` passed **354/354 viewport checks and 236 axe scans**, with no findings. The same shared footer covers the homepage, all hubs and tools, and the 404 layout. Desktop, mobile, and 320px captures passed an independent scoped visual review. Reports and captures are retained locally under `.git/frontend-audit/footer/`.

The footer uses dark translucent slate over the existing atmospheric backgrounds, the existing favicon logo, tool-hub and common-task links, legal documents, a confirmed support email, copyright, and creator credits. Repository links are omitted for the closed-source product. Footer controls are checked individually while scrolling so the audit measures reachability when a multirow footer exceeds the viewport. Legal Markdown and dialog focus, inertness, Escape dismissal, and restoration remain intact. Production computed styles confirm the 12px backdrop blur; the prefixed declaration precedes the standard property so minification retains browser support.

Validation passed: project ESLint, production build, 65 Text/shared unit tests, 45 Docs/Image unit tests, all 24 Text/shell browser suites across completed/resumed batches, and the shared legal-dialog browser suite at desktop and mobile sizes. The graphics fixture used port 4186 because the existing 4184 server served the main app. Design-system lint has zero errors. The generic premium scanner retains the same 102 unrelated findings documented above; none concern the footer.

The follow-up at `bf0e89e` changes only the URL Sanitizer's initial sample to the requested LinkedIn URL. After rebuilding, browser checks verified the exact input and tracking-free output at 1440px, 390px, and 320px; its targeted route audit passed all three viewports and both axe scans. Tool processing logic is unchanged.

## Static SEO and browser-only privacy — PR #128

The SEO/privacy application snapshot through `31bc55a` passed **354/354 route viewport checks and 236 axe scans**. A final homepage contrast adjustment additionally passed all three viewports and both axe scans in an isolated production build. Desktop/mobile screenshots confirmed that the privacy message stays readable over Dither while the existing Reactbits identity remains intact.

Validation passed: production builds, project ESLint, 73 Text/shared unit tests, 47 Docs/Image unit tests, all 26 Text/shell browser suites across completed and resumed batches, and the Docs/Image upload/keyboard/signature export suite. Unrelated loading-screen edits appeared in the shared checkout during the last batch and interrupted a navigation; the remaining suites were rerun against a separate checkout and preview. Those concurrent edits were left untouched. The resumed typography and checkbox checks used all three suite URL environment variables to select the isolated server.

The new crawler regression verifies all 118 static heads with JavaScript disabled, including unique titles/descriptions, canonicals, structured data, real 404/noindex behavior, public sitemap/robots files, and client/history cleanup. Hub titles retain actual text after WarpText renders. Privacy regressions block remote/relative Markdown image requests and verify no analytics integration. A real OCR image was recognized with external destinations blocked; a recording proxy confirmed lazy same-origin worker/core/model GETs and no uploads.

Reports/logs are retained locally under `.git/pr128-*`; the complete route report and initial screenshots are under the OS temporary `modif-in-frontend-audit/2026-10-21T09-45-19-882Z` folder. The generic premium scanner retains the same 102 previously documented textarea/unused-scrollbar findings; the project contract intentionally permits vertical text-area resizing. Automated checks do not certify physical devices, screen readers, every file format, absolute security, or search ranking. The Vercel PR build passed, but anonymous preview inspection encountered Vercel login protection. Performance measurements and their limits are recorded in [performance-audit.md](performance-audit.md).

Before merge, the concurrent navbar/logo work landed on `main` at `0f0f403` and was incorporated in `bf388b2`. The resulting build passed lint, all 120 unit tests, the updated loading/logo suite, discovery/navigation, all 119 route mounts and idle-script budgets, all 118 crawler heads, Markdown privacy, and real local OCR. A focused seven-route audit passed 21 viewport checks and 14 axe scans. Loading evidence can now be directed outside a worktree's `.git` file, and discovery checks explicitly await reveal and rendered options rather than synchronously counting a pending React update. Logs are retained as `.git/pr128-*-merged.log` and `.git/pr128-discovery-merged.log`.
