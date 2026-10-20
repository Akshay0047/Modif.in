# MODIF.in interaction contract

Visual identity and runtime token ownership are documented in [DESIGN.md](DESIGN.md). Product facts and privacy constraints come from [PRODUCT.md](PRODUCT.md), the module guides, and the maintained legal documents under `src/footer/`.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select in module tools; SearchBar + SuggestionList/AnimatedList for discovery | This contract; module shared CSS | Platform-owned option popups; immediate suggestions with optional animation | Route audit, search-combobox and search-loading browser suites |
| Date | Native input or explicit timestamp text fields | Tool format/zone labels | Browser-owned date/time popup; typed timestamps | developer-timestamp tests and route audit |
| Form | TextToolShell, DocToolShell, ImageToolWorkspace and module shared CSS | Per-tool validation; module guides | Local text/file workflows | Field-label, field-error and tool-accessibility browser suites |
| Scrollbar | src/index.css; useModuleScrollbarTheme | DESIGN.md | Shared theme; documented panel geometry | Browser computed styles and narrow route audit |

There is no account, billing, remote CRUD lifecycle, or global toast queue. Tool output/status stays with its owning workspace. Native select/date popups intentionally use platform geometry and keyboard behavior; dark foreground/background colors are explicit.

## Navigation and discovery

- The header always links home and to all three hubs; the current hub has `aria-current`. The skip link focuses `#main-content`.
- Every route has one page H1 and a meaningful document title using the existing `useRouteTitle` policy. Markdown document-preview headings are demoted inside the tool workspace.
- `SearchBar` filters local metadata immediately. Arrow keys choose suggestions, Enter opens the active tool, Escape closes suggestions, and Tab leaves the input. IME composition never submits. Clear is explicit and returns focus to the input.
- Input focus preloads AnimatedList's Motion module. While it is delayed or unavailable, `SuggestionList` exposes the same results, option IDs, active selection, and mouse behavior immediately. Loading animation must not delay typing, break `aria-activedescendant`, move input focus, or disable tool navigation. The input owns keyboard behavior in both presentations.
- Discovery queries are transient UI state, intentionally excluded from URLs and persistent storage. Tool inputs, passwords, and document contents must not be included in navigation URLs or saved by discovery/motion preferences.
- Tool cards and hub cards are links, supporting keyboard activation, middle-click, and opening a new tab. Category jumps use native hash links with a header scroll offset.
- Popular tools are curated estimates documented in `docs/popular-tools.md`; they are not traffic measurements.
- Back uses `BackButton`'s existing history/fallback behavior. Header links provide a predictable hub destination even after a direct tool visit.
- Route loading/errors and unknown routes keep recovery navigation available. `RouteContent` owns lazy loading and retry; `NotFoundPage` owns unmatched routes.

## Workspace behavior

- Preserve local processing and existing per-tool format limits. A file picker is always available alongside drag/drop. Upload triggers accept Enter and Space; loading/processing states expose status and prevent duplicate work.
- Upload precedes options in Image workspaces. `inputInPreview` changes which panel comes first; CSS must not reverse visual and keyboard order.
- Inputs have an accessible name; visible labels activate their field where applicable. Selected mode buttons expose `aria-pressed`. Errors/status are readable text, with existing shared live-region behavior.
- Signature dragging/resizing/rotation has numeric placement alternatives. PDF page selection uses native buttons. Do not require a pointer gesture for an essential action.
- Long filenames and tool labels wrap. Actual code/table/preview surfaces may scroll internally; the page itself must not develop horizontal overflow or trap mobile scrolling.
- Textareas may resize vertically within the page's width to support long input. Their shared minimum heights and internal scrolling remain available; horizontal resizing must not break reflow.
- Tool data lives in component state. Do not claim draft persistence, loss prevention, or support for a format that the implementation does not provide.

## Loading and processing

- Opening an idle document workspace does not create a document worker. `useWorkerTask` creates its runner on mount; the runner creates the worker on its first `run()`. Preserve request matching, progress, cancellation on unmount, timeouts, and retry after worker failure.
- PDF Merger keeps its main-thread merge fallback behind an action-time import after worker failure. `PdfPreview` and byte-only consumers use `_shared/pdfBytes.js`; they must not import PDF processing engines just to clone input data.
- Excel processing loads XLSX inside `csvToExcel` and `parseExcel`. Both helpers return promises and must be awaited. CSV/JSON/XML conversion retains its synchronous parsing semantics, and pending conversion prevents duplicate submissions while keeping status visible.
- Busy state covers file reads, deferred engine imports, worker/fallback processing, and publication. Clearing, replacing, reordering inputs or leaving the workspace invalidates pending results; stale work must not download files, update previews, or reset a newer operation's status. A successful fallback reports success without retaining its earlier worker error.
- Route loading retains recovery links and reserves the remaining viewport height. The footer stays below that loading region and in document flow as real content arrives.
- IBM Plex Sans uses local variable WOFF2 assets with all original Unicode subsets and the Latin preload. Preserve font roles, fallback behavior, and the shipped OFL license when changing delivery.

## Motion, focus, and overlays

- Reactbits effects are a maintained part of the identity. Motion defaults on, respects reduced-motion preferences, and can be paused/resumed globally. Only the motion preference is stored locally. Hidden tabs pause decorative work.
- Silk preserves its shader and uniform behavior using OGL. Dither retains React Three Fiber and postprocessing. Loading or renderer changes must preserve module colors, responsive sizing, interaction behavior, and the motion controls.
- Paused backgrounds and titles retain still versions of the same effects. The native cursor remains usable for coarse pointers, reduced motion, and paused effects.
- `CursorLayer` loads TargetCursor/GSAP only for an eligible fine pointer with motion enabled; the native cursor remains available until it mounts. `DecorativeBoundary` contains failed cursor, Silk, and Dither chunks so navigation and workspaces remain usable with their existing native-cursor/gradient fallback.
- Focus is visible and clears fixed header chrome. The document owns page scrolling; footer content stays in flow. Controls use at least 44px action targets where applicable, with 16px mobile input text.
- Legal dialogs portal to the body, make the background inert, trap focus, close with Escape, restore the opener and prior overflow, and contain long content within the visual viewport. Their text remains sourced from `src/footer/`.

## Verification boundary

The automated route audit covers every implemented route in desktop, mobile, and 320px layouts, plus axe checks in desktop/mobile empty states. Targeted suites cover keyboard discovery, labels, uploads, signature placement/export, processing output, and dialog behavior. See `docs/frontend-audit.md` for actual run results and limits. Automated checks are not a screen-reader, Safari, real-device, or all-file-format certification.

`npm run profile:performance` records serial cold-cache lab profiles. Measurement conditions, deployed build identity, and evidence belong in `docs/performance-audit.md`; correctness suites separately verify delayed/failed search animation, worker startup/fallback/cancellation, and Excel exports.
