# Docs Module — Agent Instructions

This directory is the **designated home for individual document-related tool subpages and Docs-tool-specific implementation files**. It is not necessarily the location for the Docs module's main hub page.

## Purpose

Use `src/modules/docs/` for future document function pages and supporting code that is specific to a document tool or subpage.

This module is intended for document tools such as PDF, DOCX, CSV, and related document-processing functionality.

Example future structure:

```
src/modules/docs/
├── AGENTS.md
├── pdf-tools/
├── docx-tools/
├── csv-tools/
└── ...
```

Do **not** create these example tool directories unless a task explicitly requires them.

## Where to put new work

- Add any new page for a document function somewhere under `src/modules/docs/`.
- Place Docs-specific components, styles, utilities, hooks, and supporting files here when they belong to a specific document tool or subpage.
- Do **not** place Docs tool pages inside `src/modules/text/` or `src/modules/image/`.

## Integration with the existing app

- Treat the existing `src/pages/DocTools.jsx` and shared application architecture as the current Docs hub/page entry point.
- Integrate new tools into the existing routing and navigation architecture rather than creating a separate application.
- Before implementing a new Docs tool, inspect the existing project structure and follow the project's existing React conventions.
- Do not assume implementation details without inspecting the repository first.

## Shared code and scope

- Reuse existing shared components where appropriate rather than creating duplicates.
- Avoid unrelated repository changes unless the task explicitly requires a shared change.
