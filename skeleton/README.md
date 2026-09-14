# MODIF.in Subdomain Skeleton

A standalone React + Vite template for `text.modif.in`, `image.modif.in`, and `docs.modif.in`.

## Quick start

```bash
cd skeleton
npm install
npm run dev
```

Runs on **http://localhost:5174** by default.

## What to customize per subdomain

| File | Replace |
|------|---------|
| `src/data/tools.js` | `itemLabel` (`ITEM` → `TEXT` / `IMAGE` / `DOCS`), subheading, categories, tools, featured flags |
| `src/data/tools.js` | `homeUrl` when modif.in routing is ready |
| `src/sections/ToolHub.jsx` | Wire tool `onClick` handlers to real routes |

## Layout

- **Header** — centred `MODIF.in` (IBM Plex Sans)
- **Hero** — WarpText heading, subheading, live search (`Category : Component`), badges
- **Body** — category grid with featured tool buttons
- **Footer** — same legal footer as the main site
- **Background** — Dither wave theme shared with the main app

## Stack

React 19, Vite 8, Three.js (Dither background), OGL (WarpText), Motion (AnimatedList search results).
