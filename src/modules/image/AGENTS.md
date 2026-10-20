# Image Module — Agent Instructions

This directory is the **designated home for individual Image tool subpages and Image-tool-specific implementation files**. It is not necessarily the location for the Image module's main hub page.

## Purpose

Use `src/modules/image/` for the implemented Image tools and supporting code that is specific to an Image tool or subpage. Reuse `_shared/ImageToolWorkspace.jsx`, shared image styles, and `handleFilePickerKeyDown` from `_shared/imageToolUtils.js`.

Example future structure:

```
src/modules/image/
├── AGENTS.md
├── image-resizer/
├── image-compressor/
├── image-converter/
└── ...
```

Do **not** create these example tool directories unless a task explicitly requires them.

## Where to put new work

- Add any new page for an Image function somewhere under `src/modules/image/`.
- Place Image-specific components, styles, utilities, hooks, and supporting files here when they belong to a specific Image tool or subpage.
- Do **not** place Image tool pages inside `src/modules/text/` or `src/modules/docs/`.

## Integration with the existing app

- Treat the existing `src/pages/ImageTools.jsx` and shared application architecture as the current Image hub/page entry point.
- Integrate new tools into the existing routing and navigation architecture rather than creating a separate application.
- Before implementing a new Image tool, inspect the existing project structure and follow the project's existing React conventions.
- Do not assume implementation details without inspecting the repository first.

## Shared code and scope

- Reuse existing shared components where appropriate rather than creating duplicates.
- Avoid unrelated repository changes unless the task explicitly requires a shared change.
- Put upload first in DOM and visual order; `inputInPreview` identifies workspaces whose preview panel owns the upload control. Do not use CSS order to contradict keyboard order.
- File triggers support Enter and Space. Label all controls, including conditional color fields, and expose selected modes with `aria-pressed`.
- Primary action text uses `--image-action-text` from the shared page; verify contrast when changing gradients.
- Run `node tests/docs-and-image/tool-accessibility.browser.mjs` and relevant processing/output regressions after shared UI changes.
