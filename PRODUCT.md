# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience is broad: anyone with a browser who needs quick utility work across text, image, and document tasks — including everyday users, creators and students, freelancers, and technical users who reach for encoding, formatting, or developer-oriented tools.

Users arrive with a specific job to finish (convert a file, clean text, merge a PDF, etc.) and expect to complete it without installing software or creating an account.

## Product Purpose

MODIF.in is a free web hub of utility tools grouped into three areas: Text, Image, and Docs.

Success means a visitor can find the right tool quickly, complete their task reliably in the browser, and leave with confidence that their content was handled appropriately for that tool.

## Positioning

A single no-account hub spanning free text, image, and document utilities. Every current tool processes files and text locally in the browser; tool content is never uploaded to a processing server.

## Operating Context

- The product runs as a client-side web app at `modif.in` on a single domain for now.
- Tools are organized into three hub pages (`/text`, `/image`, `/doc`) with individual tool routes auto-registered from `src/modules/<module>/<slug>/`.
- Local development: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.
- The site has no analytics, advertising, or tracking integration. Network requests load public static website and tool assets; hosting providers necessarily receive ordinary request information.

## Capabilities and Constraints

**Confirmed capabilities**

- Three tool hubs with 114 implemented tool routes: Text (62), Image (25), Docs (27).
- Homepage search across all three hubs, six common-task shortcuts, and persistent hub navigation.
- Each hub begins with eight curated Popular tools and offers search and category jump links.
- Every current tool processes files and text in the browser; shared tool shells surface the local-processing privacy promise.
- No account required for current tool usage.
- Supported input types vary by tool (text, images, PDF, DOCX, CSV, and related formats).
- Tool catalog metadata lives in `src/data/*Tools.js`; tool pages live under `src/modules/`.

**Confirmed constraints**

- Tool inputs and outputs must stay on the device. Processing must not upload files, text, passwords, or document contents to MODIF.in or third-party services.
- Tool engines, workers, and OCR language data load as public static assets from the same site. Downloading these assets must not send tool content.
- Support messages are separate, explicit communications: users choose what to send through their email or other communication provider.
- Tool outputs are general-purpose and must be independently verified for high-stakes use (per disclaimer).
- Plain JSX app code (no TypeScript in application source).
- React 19, Vite 8, React Router 7.

**Open / undecided**

- Usage rankings: Popular tools are an editorial selection, not measured MODIF.in traffic. See `docs/popular-tools.md`.

## Brand Commitments

- Product name: **MODIF.in**
- Tagline in current UI: **"Simple tools for your digital world."**
- Creators credited in footer: **Junaid** and **Akshay** (personal-site links in `src/sections/Footer.jsx`).
- Legal documents exist at `src/footer/privacypolicy.md` (last updated October 21, 2026), `src/footer/termsofservice.md`, and `src/footer/disclaimer.md` (last updated September 14, 2026).
- Typography in app: IBM Plex Sans.

## Evidence on Hand

- Real legal/policy copy in `src/footer/` (not to be fabricated or extended without user approval).
- Hub card copy and tool catalog in `src/data/` and `src/sections/Hero.jsx`.
- Module-specific agent guides at `AGENTS.md` and `src/modules/*/AGENTS.md`.
- No confirmed customer testimonials, case studies, benchmarks, or pricing pages in the repository — future work must not invent these.

## Product Principles

1. **Browser-only processing** — Keep all tool files, text, and outputs on the user's device. Public asset delivery and explicit support communications are separate from tool processing.
2. **No friction** — Free access without accounts for utility tasks.
3. **Hub clarity** — Text, Image, and Docs remain distinct entry points; tools must be discoverable from the right hub.
4. **Honest outputs** — Present results as aids, not guarantees; users verify before consequential use.
5. **Scope discipline** — Add tools within the correct module; reuse shared shells and utilities rather than duplicating patterns.

## Accessibility & Inclusion

The frontend targets WCAG 2.2 AA, with native controls, keyboard access, visible focus, readable contrast, and layouts that reflow down to 320 CSS pixels. Automated checks support this target; they do not certify conformance or replace assistive-technology and real-device testing.

Reactbits effects remain part of the product identity: Dither, Silk, DepthText, WarpText, and PixelCard. Motion is enabled by default, can be paused from the header, respects device reduced-motion preferences, and pauses in hidden tabs. Pause state stays on the device; tool inputs are not stored with it. Cursor styling uses static, browser-rendered SVG arrows with native interaction and accessibility fallbacks.
