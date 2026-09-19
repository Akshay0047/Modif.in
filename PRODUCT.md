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

A neighboring product could not truthfully copy this combination: a single no-account hub spanning text, image, and document utilities with a privacy-first default of client-side processing whenever the tool supports it — free to use, with processing kept local rather than uploaded to servers.

## Operating Context

- The product runs as a client-side web app at `modif.in` on a single domain for now.
- Legal copy references planned subdomains (`text.modif.in`, `image.modif.in`, `docs.modif.in`); those are not confirmed as live yet.
- Tools are organized into three hub pages (`/text`, `/image`, `/doc`) with individual tool routes auto-registered from `src/modules/<module>/<slug>/`.
- Local development: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.
- Monetization may include advertising (Google AdSense referenced in legal copy); exact ad placement and rollout are not fully confirmed in product code.

## Capabilities and Constraints

**Confirmed capabilities**

- Three tool hubs: Text (~60+ catalogued tools), Image (~25), Docs (~27).
- Browser-based processing is the default architecture; many docs tools surface a client-side privacy disclaimer.
- No account required for current tool usage.
- Supported input types vary by tool (text, images, PDF, DOCX, CSV, and related formats).
- Tool catalog metadata lives in `src/data/*Tools.js`; tool pages live under `src/modules/`.

**Confirmed constraints**

- Processing should stay in the browser whenever possible; not every tool may be fully client-side yet — privacy policy acknowledges mixed processing models per tool.
- Tool outputs are general-purpose and must be independently verified for high-stakes use (per disclaimer).
- Plain JSX app code (no TypeScript in application source).
- React 19, Vite 8, React Router 7.

**Open / undecided**

- Subdomain launch timing and routing split.
- Full implementation status of every catalogued tool (some pages may still be placeholders).
- Final advertising integration scope and placement.

## Brand Commitments

- Product name: **MODIF.in**
- Tagline in current UI: **"Simple tools for your digital world."**
- Creators credited in footer: **Junaid** and **Akshay** (GitHub links in `src/sections/Footer.jsx`).
- Legal documents exist at `src/footer/privacypolicy.md`, `src/footer/termsofservice.md`, and `src/footer/disclaimer.md` (last updated September 14, 2026).
- Typography in app: IBM Plex Sans.

## Evidence on Hand

- Real legal/policy copy in `src/footer/` (not to be fabricated or extended without user approval).
- Hub card copy and tool catalog in `src/data/` and `src/sections/Hero.jsx`.
- Module-specific agent guides at `AGENTS.md` and `src/modules/*/AGENTS.md`.
- No confirmed customer testimonials, case studies, benchmarks, or pricing pages in the repository — future work must not invent these.

## Product Principles

1. **Local first** — Prefer in-browser processing; treat server uploads as the exception and communicate clearly per tool.
2. **No friction** — Free access without accounts for utility tasks.
3. **Hub clarity** — Text, Image, and Docs remain distinct entry points; tools must be discoverable from the right hub.
4. **Honest outputs** — Present results as aids, not guarantees; users verify before consequential use.
5. **Scope discipline** — Add tools within the correct module; reuse shared shells and utilities rather than duplicating patterns.

## Accessibility & Inclusion

No product-specific accessibility standard has been confirmed yet. Baseline web accessibility should be maintained; a formal target (e.g. WCAG level) remains undecided.
