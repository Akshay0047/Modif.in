# MODIF.in

Free browser utilities for text, images, and documents. The app has 114 tool pages across [Text](https://modif.in/text) (62), [Image](https://modif.in/image) (25), and [Docs](https://modif.in/doc) (27), plus the homepage and hub pages. No account is required.

## Develop

Use a Node.js version supported by Vite 8 (20.19+ or 22.12+).

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm test
node --test tests/docs-and-image/*.test.mjs
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Browser tests expect the running app at `http://127.0.0.1:4173` and use installed Microsoft Edge by default. Set `MODIF_BASE_URL` or `BROWSER_CHANNEL` to override those values.

The graphics regression suite also checks the separate skeleton app. Start it in another terminal before running `test:browser`:

```sh
node node_modules/vite/bin/vite.js skeleton --host 127.0.0.1 --port 4184
```

Set `MODIF_SKELETON_BASE_URL` if that fixture uses a different port. The production site does not depend on the skeleton server.

```sh
npm run test:browser
node tests/docs-and-image/tool-accessibility.browser.mjs
npm run audit:frontend
```

The full route audit checks all 118 routes at 1440×900, 390×844, and 320×740; axe runs at the first two sizes. Reports and screenshots go to the operating system's temporary directory. Use `--routes /,/text` for a smaller scan, `--workers 4` for parallel pages, and `--output <directory>` to choose where reports are saved. It exits nonzero on findings. The docs/image directory also contains focused browser suites for exports, workers, redaction, tables, and PDF editing; run those directly when changing the associated tools.

For serial cold-browser-cache performance profiles:

```sh
npm run profile:performance
npm run profile:performance -- --base-url http://127.0.0.1:4173 --routes /,/doc/pdf-merger --runs 3
```

The profiler defaults to the deployed site, with desktop and mobile 4G cases. Run it separately from other browser tests and builds to avoid shared CPU contention. See the [performance audit](docs/performance-audit.md) for build identity, measurement conditions, evidence, and limits.

## Architecture

- React 19, Vite 8, React Router 7; plain JSX application code.
- `src/pages/`: homepage and three hubs. `App.jsx` discovers `src/modules/<module>/<slug>/index.jsx` automatically.
- `src/data/*Tools.js`: tool metadata and the eight-tool curated list for each hub. Folder slugs and catalog IDs must match. The `docs` folder maps to `/doc`.
- `AppShell` owns theme/background, motion settings, global header, titles, and page-view tracking. `ModuleToolLayout` owns module workspace chrome and footer.
- Shared tool owners: `TextToolShell`, `DocToolShell`, and `ImageToolWorkspace`, with module styles/utilities in each `_shared/` directory.
- Tool routes are code split. Search suggestion animation loads on focus, with immediate accessible results while its module loads or is unavailable. The original AnimatedList motion remains in use.
- Document workers start on the first processing operation. Excel import/export loads XLSX inside the asynchronous `parseExcel`/`csvToExcel` helpers; callers must await both. PDF Merger loads its main-thread fallback only when the worker path fails, and preview byte handling stays in the lightweight `pdfBytes.js` helper.
- Keep new processing libraries behind the operation that needs them. Prefer processing files locally; preserve the tool's actual format and privacy limits.

Read [AGENTS.md](AGENTS.md) and the appropriate module guide before changing a tool. The `skeleton/` directory is a separate starter/reference app; it does not drive the production routes.

## Frontend behavior

The homepage offers cross-hub search and common-task shortcuts. Each hub starts with eight curated Popular tools, followed by its full catalog. Category links, header hub navigation, wrapping labels, and keyboard search support desktop and mobile discovery. The [selection rationale](docs/popular-tools.md) distinguishes editorial estimates from measured usage.

The dark visual identity uses IBM Plex Sans, Georgia tool headings, module accents, and Reactbits effects: Dither, Silk, DepthText, WarpText, TargetCursor, and PixelCard. The header's motion control pauses decorative effects; reduced-motion preferences are respected. Footer dialogs remain reachable at every viewport.

IBM Plex Sans is self-hosted as unmodified variable WOFF2 files from the existing Google Fonts distribution. All six original Unicode subsets remain available; the Latin face is preloaded, and other scripts load through `unicode-range`. Font definitions live in `src/fonts.css`, assets in `src/assets/fonts/`, and provenance plus the SIL OFL license in [`public/fonts/ibm-plex/`](public/fonts/ibm-plex/). The typeface and typography roles remain unchanged.

Silk uses its original shader and uniform behavior with a lightweight OGL renderer. Dither retains React Three Fiber and its postprocessing pipeline. These rendering changes preserve the effects, module colors, still frames, and motion controls.

The frontend targets WCAG 2.2 AA. Automated route/accessibility tests and targeted workflows support that goal; they do not certify every browser, assistive technology, file format, or device.

## Maintained references

- [Product context](PRODUCT.md), [design system](DESIGN.md), and [interaction contract](UX-CONTRACT.md)
- [Frontend audit and verification](docs/frontend-audit.md)
- [Cold-cache performance audit](docs/performance-audit.md)
- [Merged PR and issue reconciliation](docs/issue-reconciliation.md)
- [Popular tool rationale](docs/popular-tools.md)
- Reactbits sources: [TargetCursor](https://reactbits.dev/animations/target-cursor), [Dither](https://reactbits.dev/backgrounds/dither), [PixelCard](https://reactbits.dev/components/pixel-card), and [DepthText](https://reactbits.dev/text-animations/depth-text)
- Audit reference: [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

Legal documents are maintained under `src/footer/` and shown by `Footer.jsx`. Build artifacts, local files, and credentials must not be committed.
