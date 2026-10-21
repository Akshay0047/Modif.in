---
name: MODIF.in
description: Simple tools for your digital world.
colors:
  void-black: "#000000"
  midnight-slate: "rgba(15, 20, 35, 0.4)"
  panel-border: "rgba(255, 255, 255, 0.08)"
  snow-peak: "#f8fafc"
  pure-white: "#ffffff"
  slate-mist: "#94a3b8"
  cool-gray: "#cbd5e1"
  header-rule: "#1a233a"
  royal-depth: "#13008f"
  signal-crimson: "#bf1c1c"
  indigo-pulse: "#4f46e5"
  link-violet: "#8991ff"
  text-crimson: "#991b1b"
  text-crimson-bright: "#dc2626"
  image-emerald: "#10b981"
  image-emerald-deep: "#047857"
  image-action-text: "#001a13"
  docs-amber: "#eab308"
  docs-amber-deep: "#a16207"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  brand:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  code:
    fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'
    fontSize: "0.875rem"
    lineHeight: 1.6
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "25px"
  pill: "999px"
spacing:
  xs: "0.35rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  site-footer:
    backgroundColor: "rgba(15, 20, 35, 0.8)"
    textColor: "{colors.cool-gray}"
  tool-button:
    backgroundColor: "rgba(15, 20, 35, 0.4)"
    textColor: "{colors.slate-mist}"
    rounded: "{rounded.sm}"
    padding: "1rem"
  tool-button-highlighted:
    backgroundColor: "rgba(10, 14, 26, 0.85)"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.sm}"
    padding: "1rem"
  doc-button-primary:
    backgroundColor: "rgba(234, 179, 8, 0.18)"
    textColor: "{colors.snow-peak}"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1rem"
  image-button-primary:
    backgroundColor: "#10b981"
    textColor: "{colors.image-action-text}"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1rem"
---

# Design System: MODIF.in

## Overview

**Creative North Star: "The Glass Midnight Console"**

MODIF.in reads as a dark, cinematic utility console: black canvas, animated atmospheric backgrounds, and frosted glass panels that organize dense tool catalogs without feeling like enterprise software. The brand moment is theatrical — extruded DepthText and pixel-reactive hub cards — while actual tool work stays legible, module-tinted, and calm. A crisp, browser-rendered SVG cursor adds a restrained brand detail without animated tracking.

The system balances spectacle on entry with operational clarity inside tools. Landing and hub pages sell motion and depth; tool pages shift to Georgia-serif headlines, IBM Plex Sans controls, and tinted accents that signal which module you are in (crimson for Text, emerald for Image, amber for Docs).

**Key Characteristics:**

- Always-dark foundation on `#000` with atmospheric WebGL/Silk backgrounds
- Glass panels: semi-transparent midnight slate, 12px blur, hairline white borders
- Module color coding carried through scrollbars, accents, and primary actions
- Pill-shaped tool controls; squarer 8px controls on dense hub grids
- Static SVG arrow cursor with a crimson variant on enabled interactive controls
- Serif tool titles + sans UI body for hierarchy without changing the global font stack

## Colors

The palette is intentionally restrained: neutrals carry most surfaces, module accents appear only where context demands, and indigo/crimson signal brand or interaction.

### Primary

- **Royal Depth** (#13008f): DepthText extrusion color for the MODIF.in wordmark; the brand's deep indigo shadow plane.
- **Signal Crimson** (#bf1c1c): SVG cursor accent when hovering enabled interactive controls; the system's "you can act here" signal.
- **Indigo Pulse** (#4f46e5): Popular-tool badge and highlighted hub button border glow on the default hub chrome.

### Secondary

- **Link Violet** (#8991ff): Inline links inside legal/modal reading surfaces.

### Tertiary

Module accents (use only within their module routes):

- **Crimson Lane** (#991b1b → #dc2626): Text module scrollbars and implied accent family.
- **Emerald Circuit** (#047857 → #10b981): Image module controls, primary buttons, segmented toggles.
- **Amber Archive** (#a16207 → #eab308): Docs module buttons, focus rings, dropzones, privacy disclaimers.

### Neutral

- **Void Black** (#000000): Page canvas and header base.
- **Midnight Slate** (rgba(15, 20, 35, 0.4)): Primary glass panel fill across hubs and tools.
- **Footer surface** (rgba(15, 20, 35, 0.8)): Dark translucent footer fill; the denser slate tint keeps navigation legible over the atmospheric background.
- **Snow Peak** (#f8fafc): Primary readable text on panels and inputs.
- **Slate Mist** (#94a3b8): Secondary descriptions, metadata, placeholders.
- **Panel Border** (rgba(255, 255, 255, 0.08)): Default hairline separation on glass surfaces.
- **Header Rule** (#1a233a): Fixed header bottom border and tooltip chrome.

**The Module Tint Rule.** Accent colors belong to their module. Do not use emerald primary buttons on Docs pages or amber focus rings in Image tools unless deliberately breaking module identity for a cross-cutting brand moment.

## Typography

**Display Font:** Georgia, serif (tool page titles)
**Body Font:** IBM Plex Sans, sans-serif (UI, body, labels, footer)
**Brand Display:** IBM Plex Sans 800 via DepthText (landing/hub header logo treatment)

**Code and data:** IBM Plex Mono / SFMono-Regular / Consolas / monospace fallbacks for code, Base64, structured data, and exact character outputs. This is an existing utility role, not a display face.

**Character:** Utility-first sans for controls and reading; editorial serif reserved for tool headlines so functional pages feel distinct from the marketing shell without introducing a third type family on body copy.

Fluid sizes are recorded in the hierarchy below rather than frontmatter `fontSize` fields: the design-token linter accepts single dimensions, while runtime CSS uses `clamp()`.

### Hierarchy

- **Brand Display** (800, clamp(3rem, 12vw, 7rem), 1): MODIF.in DepthText on landing and hub headers only.
- **Footer brand** (700, 1.75rem, 1, -0.02em tracking): Compact IBM Plex Sans wordmark beside the existing favicon logo.
- **Footer tagline** (400, 0.95rem, 1.6): Supporting brand sentence in the shared footer.
- **Display** (700, clamp(2rem, 5vw, 3rem), 1.25): Tool page titles in Docs/Image shells.
- **Title** (700, clamp(1.125rem, 2.2vw, 1.375rem), 1.25): PixelCard hub titles, modal headings.
- **Body** (400, clamp(0.95rem, 2vw, 1.05rem), 1.6): Descriptions, form copy, legal markdown in modals (~65–75ch where constrained).
- **Label** (600, 0.8125rem, 0.02em tracking): Field labels and segmented control text. Footer links use 400 at 0.875rem/1.5; the copyright and creator credits use 0.8125rem.

**The One Voice Sans Rule.** IBM Plex Sans is the only sans used for UI. Georgia appears only as a display headline role, never for buttons, labels, or dense control rows.

**Font delivery.** `src/fonts.css` defines the same IBM Plex Sans variable family with unmodified local WOFF2 assets from `src/assets/fonts/`. Preserve all six original Unicode subsets, their `unicode-range` declarations, the variable 100–700 weight range, and `font-display: swap`. The Latin subset is preloaded; other subsets load when needed. Provenance and the SIL OFL license are maintained under `public/fonts/ibm-plex/`. Delivery changes must retain the established font family and typography roles.

## Layout

- **Canvas model:** Full-viewport black stage with fixed atmospheric background (`position: fixed`, behind content).
- **Header:** Fixed black bar, 64px desktop / 56px mobile, compact DepthText home link, Text/Image/Docs navigation, and a motion toggle. Runtime height comes from `--app-header-height` in `src/index.css`.
- **Footer:** Shared by every route and kept in document flow. A centered `min(1280px, 100%)` container holds the brand and three navigation groups, followed by copyright, the support contact, and creator credits. The brand spans the grid below 900px; below 540px, tool hubs and common tasks form two columns and legal links wrap across the full width. It must never cover tool actions or keyboard focus.
- **Hub content:** Centered column; hero cards cap at ~980px; tool grid uses full hub width inside ToolHub.
- **Tool pages:** `min(960px, 100%)` centered column, `2rem 1.5rem 6rem` padding, reduced horizontal padding on mobile. Image workspaces put the upload panel first in both DOM and visual order; the `inputInPreview` variant identifies which panel owns upload.
- **Spacing rhythm:** 0.75rem control gaps, 1rem panel padding baseline, 1.5–2rem section separation.
- **Breakpoints:** 700px (scroll behavior and legal-dialog spacing), 768px (hero card stack), 900px/540px (footer navigation reflow), component-level clamps for type.

## Elevation & Depth

Depth is hybrid: heavy ambient shadow on marketing cards, blur-glass layering on tools, and hover lift rather than persistent material elevation everywhere.

Background motion (Dither on landing, Silk on hubs/tools) supplies atmospheric depth. Foreground panels stay relatively flat at rest with `backdrop-filter: blur(12px)` and low-opacity fills. Hover states add lift (`translateY(-2px)` to `-6px`) and intensified shadow/glow.

### Shadow Vocabulary

- **Card Ambient** (`0 10px 30px rgba(0, 0, 0, 0.8)`): PixelCard resting state.
- **Card Hover** (`0 20px 40px rgba(0, 0, 0, 0.9)` + optional glow): PixelCard hover/focus-within.
- **Dropdown Depth** (`0 20px 40px rgba(0, 0, 0, 0.9)`): Search suggestions menu.
- **Modal Stage** (`0 30px 80px rgba(0, 0, 0, 0.65)`): Legal document overlay.

**The Flat Panel Rule.** Tool panels do not use drop shadows at rest. Separation comes from border, blur, and tonal contrast against the animated background.

## Shapes

- **Marketing cards:** Generously rounded corners (25px) with pixel canvas clipped to the same radius.
- **Tool panels:** 16px radius glass containers.
- **Inputs/search:** 10–12px radius; hub buttons 8px; tool action buttons fully pill-shaped (999px).
- **Borders:** 1px hairlines at 8–14% white alpha; dashed module-tinted borders for dropzones.
- **Segmented controls:** Pill container with pill segments inside.

**The Pill Action Rule.** Inside tool workspaces, primary/secondary actions use pill buttons. Hub grids keep compact 8px rectangles for density.

## Components

### Buttons

- **Shape:** Hub grid buttons use 8px corners; tool actions use pills (999px).
- **Primary (Image):** Emerald gradient `#10b981 → #059669`, dark green text `#001a13` (at least 4.8:1 against both stops), brighter gradient on hover. The shared `.image-tool-page` owns `--image-action-text`; shared image button recipes consume it.
- **Primary (Docs):** Amber-tinted fill `rgba(234, 179, 8, 0.18)` with amber border; hover increases tint.
- **Hub default:** Transparent midnight glass, slate mist text, white border on hover.
- **Hub highlighted/popular:** Darker fill and indigo border, white text. The Popular section establishes context without repeating a badge on every button. Tool labels wrap fully; no continuously scrolling names or per-card overflow observers.

### Cards / Containers

- **PixelCard (signature):** Gradient `#0f1629 → #050914`, 25px radius, pixel hover glow, icon + title + short description; used for the three hub entry cards on landing.
- **Glass Panel:** `rgba(15, 20, 35, 0.4)` fill, blur(12px), 16px radius, hairline border; standard tool workspace container.
- **Internal Padding:** 1–1.25rem typical; PixelCard content padded 1.5rem top.

### Inputs / Fields

- **Style:** Dark inset `#0a0f1c` or `rgba(15, 20, 35, 0.55)` backgrounds, subtle borders, IBM Plex Sans 0.95rem.
- **Focus (Search):** Border shifts to `#525c96`.
- **Focus (Docs):** Amber ring `0 0 0 3px rgba(234, 179, 8, 0.12)` with amber border.
- **Focus (Image):** Emerald accent on segments/controls; range inputs use `#10b981` accent-color.

### Navigation

- **Header:** Fixed black bar with a readable DepthText brand, home link, current-hub state, and keyboard-accessible hub links.
- **Footer:** Dark translucent slate with `blur(12px)` and a hairline top border. The home link pairs the existing `/favicon.ico` logo at 48px with the MODIF.in name. Named navigation groups contain tool hubs, common tasks (word count, image compression, and PDF merging), and the existing legal documents. The support address `junuhammad2@gmail.com` is a visible `mailto:` link in the bottom row. Links and legal controls have at least 44px targets; external creator links show an arrow and announce that they open a new tab. Legal documents open in a body portal with a blurred scrim, background inertness, focus trapping/restoration, and Escape dismissal; Markdown remains sourced from `src/footer/`.
- **Discovery:** Homepage cross-hub SearchBar, six common-task links, and three PixelCard navigation links. Hubs use SearchBar + categorized ToolButton grids and a native category disclosure above the Popular tools.
- **Search suggestions:** Preserve AnimatedList's opacity animation and styling. Its Motion module loads on input focus. A shared `SuggestionList` renders the same immediately available options, active state, mouse behavior, and ARIA while animation loads or is unavailable; the combobox input remains the sole keyboard owner.

### SVG cursor

- **Appearance:** Compact Snow Peak arrow with a dark outline; the enabled interactive variant uses Signal Crimson. Both use the same shape and hotspot so hover does not shift the pointer.
- **Behavior:** The browser renders static SVG cursor assets on fine hover pointers. No overlay, animation loop, target tracking, or JavaScript is required. The cursor remains static with paused or reduced motion; coarse pointers and forced-colors mode retain platform cursors. Native text selection, drag, resize, and disabled cursor states take precedence.
- **Ownership:** `src/cursor.css`, imported by `src/index.css`, owns cursor styling and references `src/assets/cursors/arrow.svg` and `arrow-active.svg`. CSS cursor declarations retain native keyword fallbacks when assets are unavailable.
- **Use:** Native links and enabled controls receive the interactive variant. Retain `cursor-target` for custom interactive controls with equivalent keyboard semantics.

### DepthText (signature)

- **Behavior:** Extruded brand logotype with pointer tracking / auto-orbit on landing. Header branding retains the layered treatment without a perpetual animation loop.
- **Colors:** Face `#f8fafc`, depth `#13008f`; large clamp sizing for hero presence.

## Do's and Don'ts

### Do:

- **Do** keep the canvas black and let module-tinted Silk backgrounds signal context on hub/tool routes.
- **Do** use glass panels with blur(12px) and `rgba(255, 255, 255, 0.08)` borders for tool UI groupings.
- **Do** apply module accent colors to primary actions, focus states, scrollbars, and disclaimers within that module.
- **Do** use Georgia only for tool page titles; keep controls and metadata in IBM Plex Sans.
- **Do** use `cursor-target` for custom interactive controls that should receive the crimson SVG cursor.
- **Do** preserve Dither, Silk, DepthText, WarpText, and PixelCard as the site's signature. Optimize their rendering lifecycle instead of removing the effects.
- **Do** pause decorative work in hidden tabs, honor reduced motion, and provide the global motion control. Keep a still rendering when animations pause.
- **Do** use the shared focus ring, inherited scrollbar theme, and 44px action targets. Inputs on narrow screens use 16px text to avoid focus zoom.

### Don't:

- **Don't** introduce light themes or white page backgrounds; the product is dark-first end to end.
- **Don't** mix module accent colors arbitrarily across Docs/Image/Text tool pages.
- **Don't** add heavy drop shadows to flat tool panels at rest; reserve shadow stacks for cards, menus, and modals.
- **Don't** hide the system cursor globally or add cursor overlays, magnetic tracking, or animation dependencies.
- **Don't** use decorative motion on dense control rows; keep motion on brand surfaces, hovers, and background atmospherics.

## Runtime ownership and audit changes

Runtime styles remain canonical; this document mirrors their accepted values. `src/index.css` owns header height, global focus and scrollbar tokens; `src/components/AppHeader.css` consumes the header tokens; module shared CSS owns module control recipes. `src/sections/Footer.css` owns the shared footer surface, typography, spacing, and responsive grid; the `site-footer` component tokens above mirror its accepted colors. `AnimationContext.jsx` owns the user's local motion preference and visibility/reduced-motion state. This project does not generate CSS from DESIGN.md.

`Silk.jsx` renders the original Silk shader and uniform semantics through OGL; `Dither.jsx` retains React Three Fiber and postprocessing. Keep the effect appearance, module tint updates, responsive sizing, paused still frames, and context cleanup/restoration when changing either renderer. Avoid coupling these decorative renderers to workspace or search readiness.

Route loading feedback reserves the remaining viewport height through `RouteContent.css` so the in-flow footer does not first paint beside a short loading message and then move below the workspace. Heavy document engines and workers should initialize when processing starts; preview-only byte handling must stay independent of those engines. Reproducible measurement conditions and results belong in `docs/performance-audit.md`.

The shared page-loading cover is an opaque black viewport with the MODIF.in wordmark gently pulsing in opacity. Its critical styles and markup live in `index.html`, before the JavaScript entry. `PageLoadingScreen` reveals committed page content after fonts, visible images, and the background's first draw settle, with a 200ms fade and no forced minimum display time. Reduced-motion and paused-animation preferences keep the logo still. Loading covers become opaque immediately on navigation; only their exit fades.

The October 2026 audit intentionally changes fixed-footer/centered-header behavior for navigation and reflow, replaces marquee labels with wrapping text, and changes Image primary-action text for contrast. It retains the dark palette, IBM Plex Sans/Georgia roles, module accents, glass workspaces, and Reactbits effects. See `UX-CONTRACT.md` and `docs/frontend-audit.md` for verification scope.
