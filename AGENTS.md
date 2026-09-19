# MODIF.in — Agent Instructions

This file is the **project-wide guide** for AI agents working in this repository. Module-specific rules live in each module's own `AGENTS.md`.

## What this project is

MODIF.in is a client-side web app of utility tools grouped into three hubs:

- **Text** — string, encoding, developer, and generator tools
- **Image** — image conversion, editing, and metadata tools
- **Docs** — PDF, DOCX, CSV, and related document tools

Processing should stay in the browser whenever possible. Prefer local file handling over server uploads.

## Tech stack

- React 19 + Vite 8
- React Router 7
- Plain JSX (no TypeScript in app code)
- Font: IBM Plex Sans
- UI effects: Silk background, DepthText branding, TargetCursor hover targets

Run locally:

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Repository layout

```
src/
├── App.jsx                 # Route registration (including auto tool routes)
├── pages/                  # Hub pages: LandingPage, TextTools, ImageTools, DocTools
├── data/                   # Tool catalog data for each hub
├── layouts/                # Shared hub/placeholder layouts
├── components/             # Global UI components
├── hooks/                  # Shared hooks
├── sections/               # Landing/footer sections
└── modules/
    ├── text/               # Text tool subpages + _shared/
    ├── image/              # Image tool subpages + _shared/
    └── docs/               # Docs tool subpages + _shared/
```

## Module-specific instructions

Read the relevant module file before adding or changing tools:

- `src/modules/text/AGENTS.md`
- `src/modules/image/AGENTS.md`
- `src/modules/docs/AGENTS.md`

## How tool routing works

Tool pages are **auto-registered** from folder structure. Any file at:

```
src/modules/<module>/<slug>/index.jsx
```

becomes a route at:

```
/<prefix>/<slug>
```

Module-to-prefix mapping is defined in `src/App.jsx`:

| Module folder | Route prefix | Hub page        |
|---------------|--------------|-----------------|
| `text`        | `/text`      | `TextTools.jsx` |
| `image`       | `/image`     | `ImageTools.jsx`|
| `docs`        | `/doc`       | `DocTools.jsx`  |

Example: `src/modules/docs/csv-converter/index.jsx` → `/doc/csv-converter`

No manual route entry is needed in `App.jsx` when the folder name matches the slug.

## How hub listings work

Each hub reads tool metadata from `src/data/`:

- `textTools.js`
- `imageTools.js`
- `docTools.js`

Use `createTool(prefix, id, name, category, isPopular?)` from `src/data/createTool.js`.

The tool `id` must match the folder slug under `src/modules/<module>/`. If the page exists but the hub card does not, add it to the matching `*Tools.js` file.

## Adding a new tool

1. Pick the correct module (`text`, `image`, or `docs`).
2. Create `src/modules/<module>/<slug>/index.jsx` exporting a default React component.
3. Add the tool entry to the matching file in `src/data/`.
4. Reuse the module's shared shell/components:
   - Docs: `DocToolShell`, `FileDropZone`, `_shared/doc-tool.css`
   - Image: `ImageToolWorkspace`, `_shared/imageToolUtils.js`, `_shared/image-tool.css`
   - Text: follow patterns in nearby tools under `_shared/`
5. Keep tool logic colocated in the tool folder unless it is reused by multiple tools in the same module.
6. Install any new npm dependency and verify `npm run dev` resolves imports.

## Implementation conventions

- Inspect nearby implemented tools in the same module before inventing new patterns.
- Prefer dynamic imports for heavy libraries (`import("jszip")`, `import("heic2any")`, workers, etc.).
- Reuse existing shared utilities instead of duplicating helpers.
- Keep changes scoped to the requested tool/module unless a shared fix is required.
- Do not create placeholder tool directories unless a task explicitly asks for them.
- Do not move hub pages into `src/modules/`; hubs stay in `src/pages/`.

## Design and UX

- Preserve the existing MODIF.in visual language: Silk background, header brand link to `/`, footer on tool pages.
- Use `cursor-target` on interactive controls that should respond to TargetCursor.
- Match module color themes already used by each hub/shell.
- For privacy-sensitive tools, use `LocalSecurityDisclaimer` where other docs tools do.

## What not to do

- Do not place text tools under `image/` or `docs/`, or cross-place tools between modules.
- Do not assume routing, filenames, or shell components without reading the repo first.
- Do not add unrelated refactors, docs, or dependency upgrades unless requested.
- Do not commit secrets or environment files.

## Useful references

- Hub layout: `src/layouts/ToolHubLayout.jsx`
- Route wiring: `src/App.jsx`
- Brand/component references: `README.md`
