# Merged PR and issue reconciliation

Reviewed on 20 October 2026 against `main` at `1cb104b6a10c16d25c91f0afea83aa65a28381aa`, with the remaining label finding rechecked after frontend commit `ade00d3`.

**Final issue state: zero open issues.** This task closed 36 individual findings and the two completed QA trackers. The 37 earlier finding closures remain closed.

## Scope and method

- Queried every merged pull request and every open issue in [Akshay0047/Modif.in](https://github.com/Akshay0047/Modif.in): 52 merged PRs and 38 open issues at the start.
- Read the merged PR descriptions and issue acceptance criteria, checked the relevant current implementation and committed regressions, and confirmed that all 52 merge commits are ancestors of `main`.
- The earlier text/routing remediations had already closed 37 of the 73 findings numbered #7–#79. The remaining open findings were the 36 docs/image/shared UI findings, plus the audit and ownership trackers #80 and #81.
- Closed only findings whose reported defect was addressed in the merged code. A merged PR alone did not count as proof of complete resolution.

## Findings resolved by merged PRs

- [PR #120](https://github.com/Akshay0047/Modif.in/pull/120): closed [#34](https://github.com/Akshay0047/Modif.in/issues/34), [#35](https://github.com/Akshay0047/Modif.in/issues/35), and [#66](https://github.com/Akshay0047/Modif.in/issues/66). Redaction rebuilds every page from rendered pixels, maps selections to the export canvas, and accepts pointer input. The UI explains loss of selectable text. Evidence: `redaction-tool/index.jsx`, `redactionGeometry.js`, and the redaction unit/browser regressions.
- [PR #121](https://github.com/Akshay0047/Modif.in/pull/121): closed [#36](https://github.com/Akshay0047/Modif.in/issues/36), [#45](https://github.com/Akshay0047/Modif.in/issues/45), [#46](https://github.com/Akshay0047/Modif.in/issues/46), [#47](https://github.com/Akshay0047/Modif.in/issues/47), [#48](https://github.com/Akshay0047/Modif.in/issues/48), and [#76](https://github.com/Akshay0047/Modif.in/issues/76). Keywords accept strings; XMP is removed; form values are flattened before removal; active structures are removed; annotation appearances are baked or processing stops safely; requested rotations add to source rotations. Evidence: `pdfDocumentOps.js`, `pdfUtils.js`, and `pdf-sanitize.test.mjs`.
- [PR #122](https://github.com/Akshay0047/Modif.in/pull/122): closed [#39](https://github.com/Akshay0047/Modif.in/issues/39), [#59](https://github.com/Akshay0047/Modif.in/issues/59), and [#71](https://github.com/Akshay0047/Modif.in/issues/71). Vite bundles the module worker, requests settle on failure/timeout/cancellation, status and progress semantics are exposed, and PDF exports use current settings. Evidence: `createDocWorker.js`, `workerTaskRunner.js`, shared progress/status components, export handlers, and worker regressions.
- [PR #123](https://github.com/Akshay0047/Modif.in/pull/123): closed [#56](https://github.com/Akshay0047/Modif.in/issues/56), [#61](https://github.com/Akshay0047/Modif.in/issues/61), [#67](https://github.com/Akshay0047/Modif.in/issues/67), [#68](https://github.com/Akshay0047/Modif.in/issues/68), [#75](https://github.com/Akshay0047/Modif.in/issues/75), and [#79](https://github.com/Akshay0047/Modif.in/issues/79). Signature coordinates follow the displayed canvas, fields have labels, unreadable PDFs recover, form types use stable checks, and editor placement/export waits for correct per-page geometry. Evidence: affected docs pages, `fieldKind.js`, `signaturePoint.js`, `pageScale.js`, and interaction/geometry regressions.
- [PR #124](https://github.com/Akshay0047/Modif.in/pull/124): closed [#49](https://github.com/Akshay0047/Modif.in/issues/49), [#50](https://github.com/Akshay0047/Modif.in/issues/50), [#51](https://github.com/Akshay0047/Modif.in/issues/51), and [#70](https://github.com/Akshay0047/Modif.in/issues/70). WebP decodes to PNG, Unicode lines use browser font rendering, text preserves newlines/blank lines/four-space tabs, and legacy `.doc` is explicitly rejected with `.docx` guidance. Evidence: To PDF conversion, `unicodeTextPdf.js`, and To PDF regressions.
- [PR #125](https://github.com/Akshay0047/Modif.in/pull/125): closed [#43](https://github.com/Akshay0047/Modif.in/issues/43), [#44](https://github.com/Akshay0047/Modif.in/issues/44), [#69](https://github.com/Akshay0047/Modif.in/issues/69), and [#72](https://github.com/Akshay0047/Modif.in/issues/72). Extracted rows retain page identity and selected serialization; multiline Markdown cells stay on one row; arbitrary CSV headers use XML attributes. Evidence: `tableRows.js`, `csvUtils.js`, and table regressions. Table detection remains heuristic; these closures concern the reported cross-page corruption and invalid output defects.
- [PR #126](https://github.com/Akshay0047/Modif.in/pull/126): closed [#40](https://github.com/Akshay0047/Modif.in/issues/40), [#41](https://github.com/Akshay0047/Modif.in/issues/41), [#42](https://github.com/Akshay0047/Modif.in/issues/42), [#63](https://github.com/Akshay0047/Modif.in/issues/63), [#64](https://github.com/Akshay0047/Modif.in/issues/64), and [#77](https://github.com/Akshay0047/Modif.in/issues/77). Batches activate/settle correctly, splitter dimensions accept canvases, HEIC output regenerates after changes, shared helper text contrast improves, empty controls regions avoid unnecessary scrolling, and favicon references follow included sizes. Evidence: affected image pages, `imageToolCommon.css`, and image reprocessing/browser regressions. Issue #62 required the additional frontend fix recorded below.
- [PR #127](https://github.com/Akshay0047/Modif.in/pull/127): closed [#52](https://github.com/Akshay0047/Modif.in/issues/52), [#54](https://github.com/Akshay0047/Modif.in/issues/54), and [#55](https://github.com/Akshay0047/Modif.in/issues/55). Legal dialogs move/trap/restore focus and make their background inert; Silk uses demand rendering with reduced motion; direct-entry Back uses the owning hub. Evidence: `Footer.jsx`, `Silk.jsx`, `backNavigation.js`, and shared UI regressions.

This initial reconciliation closed **35 individual findings**. No issue comments were posted as part of the reconciliation.

## Remaining findings resolved during the frontend audit

- [#62 — Image field labels](https://github.com/Akshay0047/Modif.in/issues/62): initially retained because Placeholder Image Generator revealed an unnamed color input when Border width was greater than zero. Commit `ade00d3` gives that input the accessible name `Border color`. The fresh `tool-accessibility.browser.mjs` regression focused the Border width slider, increased it by keyboard, and found the visible named Border color input at desktop and mobile widths. The full route audit also checked control naming across all image pages. The issue is now closed as completed.
- [#80 — Original QA audit](https://github.com/Akshay0047/Modif.in/issues/80) and [#81 — Remediation ownership plan](https://github.com/Akshay0047/Modif.in/issues/81): closed as completed after every one of the 73 underlying findings was closed and the docs/image browser regressions passed. Their historical evidence and ownership record remain available.
- A fresh `gh issue list --state open --limit 1000 --json number,title` returned `[]` after these final three closures. Total closures in this task: **38 issues** (36 findings and 2 trackers).

## Complete merged PR inventory

All entries below were merged and present in `main` at review time. Stacked PRs sometimes share a merge commit; this is expected and is not evidence of an omitted change.

- [#1](https://github.com/Akshay0047/Modif.in/pull/1) — Enable hero text tilt animation.
- [#2](https://github.com/Akshay0047/Modif.in/pull/2) — Add legal documents.
- [#3](https://github.com/Akshay0047/Modif.in/pull/3) — Initial feature integration (`Junaid`).
- [#4](https://github.com/Akshay0047/Modif.in/pull/4) — Add buttons and logos.
- [#5](https://github.com/Akshay0047/Modif.in/pull/5) — Keep Silk mounted between module tools.
- [#6](https://github.com/Akshay0047/Modif.in/pull/6) — Fix Docs hub.
- [#82](https://github.com/Akshay0047/Modif.in/pull/82) — MD5 and empty hashing (#11).
- [#83](https://github.com/Akshay0047/Modif.in/pull/83) — Morse word boundaries (#12).
- [#84](https://github.com/Akshay0047/Modif.in/pull/84) — Native keyboard navigation (#7).
- [#85](https://github.com/Akshay0047/Modif.in/pull/85) — Preserve functional URL data (#29).
- [#86](https://github.com/Akshay0047/Modif.in/pull/86) — YAML data preservation (#18).
- [#87](https://github.com/Akshay0047/Modif.in/pull/87) — UTF-8 binary/hex round trips (#13).
- [#88](https://github.com/Akshay0047/Modif.in/pull/88) — Preserve all JSON keys (#19).
- [#89](https://github.com/Akshay0047/Modif.in/pull/89) — Correct ULID layout (#33).
- [#90](https://github.com/Akshay0047/Modif.in/pull/90) — CSV header escaping (#20).
- [#91](https://github.com/Akshay0047/Modif.in/pull/91) — Clipboard error and manual fallback (#78).
- [#92](https://github.com/Akshay0047/Modif.in/pull/92) — Non-global regular expressions (#21).
- [#93](https://github.com/Akshay0047/Modif.in/pull/93) — Strict byte/ASCII decoding (#14).
- [#94](https://github.com/Akshay0047/Modif.in/pull/94) — Unknown-route recovery (#8).
- [#95](https://github.com/Akshay0047/Modif.in/pull/95) — Unbiased Web Crypto generators (#37).
- [#96](https://github.com/Akshay0047/Modif.in/pull/96) — Syntax-aware JavaScript formatting (#22).
- [#97](https://github.com/Akshay0047/Modif.in/pull/97) — Canonical Roman numerals (#15).
- [#98](https://github.com/Akshay0047/Modif.in/pull/98) — Preserve SQL literals (#23).
- [#99](https://github.com/Akshay0047/Modif.in/pull/99) — Complete radix validation (#16).
- [#100](https://github.com/Akshay0047/Modif.in/pull/100) — Descriptive route titles (#9).
- [#101](https://github.com/Akshay0047/Modif.in/pull/101) — Syntax-aware JavaScript minification (#24).
- [#102](https://github.com/Akshay0047/Modif.in/pull/102) — Arbitrary-precision integer conversion (#17).
- [#103](https://github.com/Akshay0047/Modif.in/pull/103) — Preserve CSS strings and token spacing (#25).
- [#104](https://github.com/Akshay0047/Modif.in/pull/104) — Grapheme-safe reversal (#30).
- [#105](https://github.com/Akshay0047/Modif.in/pull/105) — EFF passphrases and entropy (#38).
- [#106](https://github.com/Akshay0047/Modif.in/pull/106) — Scoped accessible search (#53).
- [#107](https://github.com/Akshay0047/Modif.in/pull/107) — Preserve XML content whitespace (#26).
- [#108](https://github.com/Akshay0047/Modif.in/pull/108) — Native catalog link behavior (#57).
- [#109](https://github.com/Akshay0047/Modif.in/pull/109) — Inline invalid Find & Replace regex errors (#32).
- [#110](https://github.com/Akshay0047/Modif.in/pull/110) — Explicit timestamp units (#27).
- [#111](https://github.com/Akshay0047/Modif.in/pull/111) — Generator checkbox targets (#65).
- [#112](https://github.com/Akshay0047/Modif.in/pull/112) — Unicode title case (#73).
- [#113](https://github.com/Akshay0047/Modif.in/pull/113) — Repeated query values (#28).
- [#114](https://github.com/Akshay0047/Modif.in/pull/114) — Assigned italic small h (#74).
- [#115](https://github.com/Akshay0047/Modif.in/pull/115) — Invalid JWT expiry retains claims (#31).
- [#116](https://github.com/Akshay0047/Modif.in/pull/116) — Lazy routes and load recovery (#58).
- [#117](https://github.com/Akshay0047/Modif.in/pull/117) — Text labels and feedback (#60).
- [#118](https://github.com/Akshay0047/Modif.in/pull/118) — Lint and lifecycle integration (#10).
- [#119](https://github.com/Akshay0047/Modif.in/pull/119) — Combined remediation baseline tracking; no separate finding.
- [#120](https://github.com/Akshay0047/Modif.in/pull/120) — Redaction content removal, geometry, and touch.
- [#121](https://github.com/Akshay0047/Modif.in/pull/121) — PDF sanitization, flattening, and rotation.
- [#122](https://github.com/Akshay0047/Modif.in/pull/122) — Workers, progress, and fresh exports.
- [#123](https://github.com/Akshay0047/Modif.in/pull/123) — PDF interaction, labels, and failed uploads.
- [#124](https://github.com/Akshay0047/Modif.in/pull/124) — To PDF format and text fidelity.
- [#125](https://github.com/Akshay0047/Modif.in/pull/125) — Table and document serialization.
- [#126](https://github.com/Akshay0047/Modif.in/pull/126) — Image processing and workspace fixes.
- [#127](https://github.com/Akshay0047/Modif.in/pull/127) — Legal dialogs, reduced-motion Silk, and Back navigation.

## Verification and limits

- Fresh `node --test tests/docs-and-image/*.test.mjs`: **39/39 passed** after `npm ci`.
- Fresh runs of all **seven docs/image browser suites passed** on the development server at 1440px and 390px: image reprocessing, PDF interaction, redaction, shared UI, tables, tool accessibility, and document workers. They exercise actual downloads and output inspection, failed-input recovery, pointer signatures, conditional labels, keyboard upload/placement, legal dialog focus/inertness, and worker navigation cancellation. The HEIC decoder boundary is mocked in its dedicated development-server regression, as documented in that test.
- The shared UI regression now covers all three legal dialogs, confirms the global header is inside the inert background, and checks restoration of the actual previous body overflow value.
- The subsequent frontend audit records its separate frozen production route, accessibility, viewport, and visual checks. Historical PR verification claims are not substituted for those new checks.
- The initial test attempt ran before dependencies finished installing and failed on missing `pdf-lib`/`papaparse`; the complete rerun above passed. This was an environment failure, not an application regression.
- Closures describe the merged repository implementation. They do not certify the currently deployed site or physical mobile devices, and do not claim a screen-reader session was performed.
- The prior #118 deployment check reported missing Vercel project access for the Git author. Publishing/deployment status must be checked separately from local build success.
