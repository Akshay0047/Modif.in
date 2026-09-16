# Text Module — Agent Instructions

This directory is the **designated home for individual Text tool subpages and Text-tool-specific implementation files**. It is not necessarily the location for the Text module's main hub page.

## Purpose

Use `src/modules/text/` for future Text function pages and supporting code that is specific to a Text tool or subpage.

Example future structure:

```
src/modules/text/
├── AGENTS.md
├── word-counter/
├── sentence-counter/
├── text-case/
└── ...
```

Do **not** create these example tool directories unless a task explicitly requires them.

## Where to put new work

- Add any new page for a Text function somewhere under `src/modules/text/`.
- Place Text-specific components, styles, utilities, hooks, and supporting files here when they belong to a specific Text tool or subpage.
- Do **not** place Text tool pages inside `src/modules/image/` or `src/modules/docs/`.

## Integration with the existing app

- Treat the existing `src/pages/TextTools.jsx` and related shared architecture as the current Text hub/page entry point.
- Integrate new tool pages into the existing routing and navigation architecture rather than creating a separate application.
- Before creating a new Text tool page, inspect the existing project structure and follow the project's existing React conventions.
- Do not assume a particular filename, routing library, or implementation pattern if the repository already establishes one; inspect the relevant files first.

## Shared code and scope

- Do not create duplicate shared components when an existing reusable component can be used.
- Do not modify unrelated modules unless the task explicitly requires a shared change.
