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
  docs-amber: "#eab308"
  docs-amber-deep: "#a16207"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  brand:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "clamp(3rem, 12vw, 7rem)"
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "clamp(1.125rem, 2.2vw, 1.375rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "clamp(0.95rem, 2vw, 1.05rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"IBM Plex Sans", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
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
    textColor: "#ecfdf5"
    rounded: "{rounded.pill}"
    padding: "0.55rem 1rem"
---

# Design System: MODIF.in

## Overview

**Creative North Star: "The Glass Midnight Console"**

MODIF.in reads as a dark, cinematic utility console: black canvas, animated atmospheric backgrounds, and frosted glass panels that organize dense tool catalogs without feeling like enterprise software. The brand moment is theatrical — extruded DepthText, a custom TargetCursor, and pixel-reactive hub cards — while actual tool work stays legible, module-tinted, and calm.

The system balances spectacle on entry with operational clarity inside tools. Landing and hub pages sell motion and depth; tool pages shift to Georgia-serif headlines, IBM Plex Sans controls, and tinted accents that signal which module you are in (crimson for Text, emerald for Image, amber for Docs).

**Key Characteristics:**

- Always-dark foundation on `#000` with atmospheric WebGL/Silk backgrounds
- Glass panels: semi-transparent midnight slate, 12px blur, hairline white borders
- Module color coding carried through scrollbars, accents, and primary actions
- Pill-shaped tool controls; squarer 8px controls on dense hub grids
- Custom cursor interaction on `.cursor-target` elements with crimson hover state
- Serif tool titles + sans UI body for hierarchy without changing the global font stack

## Colors

The palette is intentionally restrained: neutrals carry most surfaces, module accents appear only where context demands, and indigo/crimson signal brand or interaction.

### Primary

- **Royal Depth** (#13008f): DepthText extrusion color for the MODIF.in wordmark; the brand's deep indigo shadow plane.
- **Signal Crimson** (#bf1c1c): TargetCursor accent when hovering interactive targets; the system's "you can act here" signal.
- **Indigo Pulse** (#4f46e5): Popular-tool badge and highlighted hub button border glow on the default hub chrome.

### Secondary

- **Link Violet** (#8991ff): Inline links inside legal/modal reading surfaces.

### Tertiary

Module accents (use only within their module routes):

- **Crimson Lane** (#991b1b → #dc2626): Text module scrollbars and implied accent family.
- **Emerald Circuit** (#047857 → #10b981): Image module controls, primary buttons, segmented toggles.
- **Amber Archive** (#a16207 → #eab308): Docs module buttons, focus rings, dropzones, privacy disclaimers.

### Neutral

- **Void Black** (#000000): Page canvas, header, footer base.
- **Midnight Slate** (rgba(15, 20, 35, 0.4)): Primary glass panel fill across hubs and tools.
- **Snow Peak** (#f8fafc): Primary readable text on panels and inputs.
- **Slate Mist** (#94a3b8): Secondary descriptions, metadata, placeholders.
- **Panel Border** (rgba(255, 255, 255, 0.08)): Default hairline separation on glass surfaces.
- **Header Rule** (#1a233a): Fixed header bottom border and tooltip chrome.

**The Module Tint Rule.** Accent colors belong to their module. Do not use emerald primary buttons on Docs pages or amber focus rings in Image tools unless deliberately breaking module identity for a cross-cutting brand moment.

## Typography

**Display Font:** Georgia, serif (tool page titles)
**Body Font:** IBM Plex Sans, sans-serif (UI, body, labels, footer)
**Brand Display:** IBM Plex Sans 800 via DepthText (landing/hub header logo treatment)

**Character:** Utility-first sans for controls and reading; editorial serif reserved for tool headlines so functional pages feel distinct from the marketing shell without introducing a third type family on body copy.

### Hierarchy

- **Brand Display** (800, clamp(3rem, 12vw, 7rem), 1): MODIF.in DepthText on landing and hub headers only.
- **Display** (700, clamp(2rem, 5vw, 3rem), 1.25): Tool page titles in Docs/Image shells.
- **Title** (700, clamp(1.125rem, 2.2vw, 1.375rem), 1.25): PixelCard hub titles, modal headings.
- **Body** (400, clamp(0.95rem, 2vw, 1.05rem), 1.6): Descriptions, form copy, legal markdown in modals (~65–75ch where constrained).
- **Label** (600, 0.8125rem, 0.02em tracking): Field labels, segmented control text, footer links.

**The One Voice Sans Rule.** IBM Plex Sans is the only sans used for UI. Georgia appears only as a display headline role, never for buttons, labels, or dense control rows.

## Layout

- **Canvas model:** Full-viewport black stage with fixed atmospheric background (`position: fixed`, behind content).
- **Header:** 48px fixed black bar, centered brand link, `#1a233a` bottom rule.
- **Footer:** 40px fixed bar on desktop; stacks on mobile at `max-width: 700px`.
- **Hub content:** Centered column; hero cards cap at ~980px; tool grid uses full hub width inside ToolHub.
- **Tool pages:** `min(960px, 100%)` centered column, `2rem 1.5rem 6rem` padding, two-column grids on wider image tools (`1fr / 1.15fr`).
- **Spacing rhythm:** 0.75rem control gaps, 1rem panel padding baseline, 1.5–2rem section separation.
- **Breakpoints:** 700px (footer/scroll behavior), 768px (hero card stack), component-level clamps for type.

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
- **Primary (Image):** Emerald gradient `#10b981 → #059669`, snow text, brighter gradient on hover.
- **Primary (Docs):** Amber-tinted fill `rgba(234, 179, 8, 0.18)` with amber border; hover increases tint.
- **Hub default:** Transparent midnight glass, slate mist text, white border on hover.
- **Hub highlighted/popular:** Darker fill, indigo border/glow, white text, "POPULAR" badge in indigo pill.

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

- **Header:** Fixed black bar, DepthText brand scaled down, links home.
- **Footer:** Low-contrast legal links, modal overlays for policy documents with blurred scrim.
- **Hub tool grid:** SearchBar + categorized AnimatedList/ToolButton grid.

### TargetCursor (signature)

- **Behavior:** Replaces default cursor on most pages; crimson accent on `.cursor-target` hover; hidden during intro screen.
- **Use:** Apply `cursor-target` class to interactive marketing and tool controls that should feel "magnetic."

### DepthText (signature)

- **Behavior:** Extruded brand logotype with pointer tracking / auto-orbit on landing and headers.
- **Colors:** Face `#f8fafc`, depth `#13008f`; large clamp sizing for hero presence.

## Do's and Don'ts

### Do:

- **Do** keep the canvas black and let module-tinted Silk backgrounds signal context on hub/tool routes.
- **Do** use glass panels with blur(12px) and `rgba(255, 255, 255, 0.08)` borders for tool UI groupings.
- **Do** apply module accent colors to primary actions, focus states, scrollbars, and disclaimers within that module.
- **Do** use Georgia only for tool page titles; keep controls and metadata in IBM Plex Sans.
- **Do** add `cursor-target` to interactive elements that should respond to TargetCursor.

### Don't:

- **Don't** introduce light themes or white page backgrounds; the product is dark-first end to end.
- **Don't** mix module accent colors arbitrarily across Docs/Image/Text tool pages.
- **Don't** add heavy drop shadows to flat tool panels at rest; reserve shadow stacks for cards, menus, and modals.
- **Don't** replace TargetCursor with default pointer styling on primary interactive surfaces without a deliberate accessibility-driven exception.
- **Don't** use decorative motion on dense control rows; keep motion on brand surfaces, hovers, and background atmospherics.
