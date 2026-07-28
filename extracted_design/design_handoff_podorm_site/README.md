# Handoff: PodorM — futurist ASCII site

## Overview
A single-page personal/product site for **PodorM**. A full-viewport hero shows the wordmark "PODORM" rendered as an animated ASCII character grid that decodes out of noise, standing on an animated perspective floor grid ("horizon"). Below it: a market index board, a GitHub repo list, course notes, a photo gallery, and a footer.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy verbatim. The task is to **recreate these designs in the target codebase's environment** (React/Next, Vue, Astro, plain static, etc.) using its established patterns. If no codebase exists yet, a static site (Astro / Next static export / plain HTML+CSS+JS) is the right fit — the page has no backend requirements today.

Two source files matter:
- `PodorM Site.dc.html` — the site. It is a *streaming design component*: markup lives inside `<x-dc>`, and a `class Component` block holds the animation logic. Read the markup as ordinary HTML with inline styles, and the class as ordinary JS. The `ref="{{ refX }}"` attributes are just element references handed to the animation loop; in React they become `useRef`.
- `PodorM Banners.dc.html` — five hero-banner explorations (1a–1e) and five motion studies (2a–2e) of the chosen direction. Reference only; **2e** is the direction that became the site.
- `_ds/nocturne-…/styles.css` — the Nocturne design system stylesheet. All CSS custom properties (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`) and the `.btn`, `.card`, `.tag`, `.lighten` classes come from it. Port this file or map its tokens into the target system.

## Fidelity
**High fidelity.** Colors, type, spacing, animation timings and copy are final-ish; recreate pixel-for-pixel using the codebase's own primitives. The **copy is placeholder** except the brand name, the nav labels (Market / Github / Course Notes / Photos), the index names, and "POWERED BY MZX" — see "Open questions".

## Screens / Views

### 1. Hero (`#top`)
- **Purpose**: brand statement + two entry actions.
- **Layout**: `position:relative; height:100vh; min-height:640px; overflow:hidden`. Background `linear-gradient(180deg,#171a2e 0%,#0f101c 62%,#0b0c14 100%)`. Three absolutely-positioned layers:
  1. **Floor grid** — `left:-60%; right:-60%; bottom:0; height:110vh` (deliberately much wider than the viewport so its side edges never enter frame). Background: two repeating linear gradients — horizontals `rgba(145,132,217,.4) 0 1px, transparent 1px 64px`, verticals `rgba(145,132,217,.32) 0 1px, transparent 1px 100px`. `transform: perspective(1400px) rotateX(62deg); transform-origin: bottom center`. Masked with `linear-gradient(to bottom, transparent, #000 26%)` so the far edge dissolves ~10% below the horizon line. Animated: `@keyframes podFloor { from { background-position:0 0,0 0 } to { background-position:0 64px,0 0 } }`, `9s linear infinite` — one full cell of travel per cycle, so the loop is seamless. NOTE: the perspective value must stay large (1400px); at 420px the plane collapses into a ~90px sliver.
  2. **Horizon line** — full width, `top:58%`, 1px, `linear-gradient(to right, transparent, rgba(145,132,217,.7) 20%, rgba(145,132,217,.7) 80%, transparent)`.
  3. **Content stack** — `inset:0`, flex column, centered, `gap:30px`, `padding:0 56px 22vh` (the bottom padding lifts the stack above the horizon).
- **Components**:
  - **ASCII wordmark** — `<pre>`, JetBrains Mono, `font-size: clamp(18px, 3.4vw, 48px)`, `line-height:1`, `letter-spacing:1px`, color `var(--color-text)` (#e9e9ed), `text-shadow:0 0 30px rgba(145,132,217,.5)`. Content is regenerated every animation frame (see "Interactions").
  - **Subtitle** — flex row, JetBrains Mono 14px, `letter-spacing:.5em`, uppercase, `var(--color-accent-300)`. Text types out one character at a time; a trailing `_` blinks via `@keyframes podBlink` (`1s steps(1) infinite`).
  - **Buttons** — `.btn.btn-primary` ("Browse market", anchors to #market) and `.btn.btn-ghost` ("Read the notes", anchors to #notes), `gap:12px`, `margin-top:10px`. Primary is a 1px accent **outline**, never a filled accent block.

### 2. Header (fixed)
`position:fixed; top:0; z-index:20`, flex row space-between, `padding:22px 56px`. JetBrains Mono 12px, `letter-spacing:.22em`, uppercase, `var(--color-neutral-400)`. Background `linear-gradient(to bottom, rgba(15,16,28,.92), rgba(15,16,28,0))` + `backdrop-filter: blur(6px)`. Brand "PodorM" left (in `--color-text`), nav right with `gap:36px`: Market, Github, Course Notes, Photos → in-page anchors. Link color `--color-neutral-300`, hover `--color-accent`, `transition: color .18s ease`.

### 3. Market (`#market`) — index board
- `padding:120px 56px`, flex column, `gap:44px`, `border-top:1px solid var(--color-neutral-800)`.
- Section head pattern (used by every section): mono kicker `12px / .3em / uppercase / --color-accent-300` reading "01 / Market"; `<h2>` in `--font-heading`, weight **500**, 44px, `letter-spacing:-.01em`; then a 520px 1px rule fading right (`linear-gradient(to right, var(--color-neutral-600), transparent)`).
- Body: `display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px` — five `.card.elev-sm` tiles, one per index: **S&P 500 / SPX, NASDAQ / IXIC, CSI 300 / 000300, NIKKEI 225 / N225, XIU · TSX 60 / XIU.TO**. Each card: mono 12px `.24em` label row (name left, ticker right, `--color-neutral-400`); value row with the level at mono 26px `--color-text` and the change at mono 14px; a 44-character ASCII sparkline `<pre>` at mono 14px in `--color-accent-400`.
- Change color: up → `--color-accent-300` prefixed "▲ +"; down → `--color-neutral-400` prefixed "▼ ".
- A mono 11px caption below the grid reads "Simulated feed · not live market data".

### 4. Github (`#github`)
- Same padding/head pattern, kicker "02 / Github", h2 "Open repositories.", background `linear-gradient(180deg,#12131f,#0f101c)`.
- Rows are anchors: `display:grid; grid-template-columns: minmax(0,1.1fr) minmax(0,2fr) 120px 90px; gap:24px; align-items:baseline; padding:22px 0; border-top:1px solid var(--color-neutral-800)` (last row also has a bottom border). Columns: repo path (mono 14px, `--color-text`), description (body font 15px, `--color-neutral-400`), language (mono, `--color-neutral-500`), star count (mono, `--color-accent-300`, right-aligned). Hover tints the row `rgba(145,132,217,.06)`.
- Current rows are placeholders: podorm/ascii-core, podorm/horizon-grid, podorm/mzx.

### 5. Course Notes (`#notes`)
- Kicker "03 / Course Notes", h2 "Written while learning."
- `grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:20px`; each card is an anchor `.card.elev-sm` with `.card-kicker` (topic · read time), `.card-title`, `.card-body`.
- **Intended data source**: the user keeps these notes in a GitHub repo. Wire this section to that repo (list markdown files / front-matter titles, link each card to the file or a rendered route).

### 6. Photos (`#photos`)
- Kicker "04 / Photos", h2 "Shot in the dark.", background `linear-gradient(180deg,#12131f,#0f101c)`.
- `grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); grid-auto-rows:240px; gap:16px`; first tile spans 2 columns × 2 rows, four more 1×1.
- Each tile is wrapped in `.lighten` (`mix-blend-mode: lighten`) — Nocturne's image treatment: photographs shot on dark backgrounds blend into the page. In the prototype the tiles are `<image-slot>` drag-and-drop placeholders; in production these are ordinary `<img>` (or next/image) inside the same wrapper, `object-fit:cover`, `border-radius:8px`.

### 7. Footer
`padding:72px 56px 56px`, flex row, space-between, `align-items:flex-end`, top border `--color-neutral-800`. Left: a tiny static ASCII "PODORM" mark (`<pre>`, mono 9px, `--color-neutral-600`) above the line "Powered by MZX". Right: the same four nav links, mono 12px, `gap:28px`.

## Interactions & Behavior

### The ASCII engine (the heart of the design)
A 5×7 bitmap font is defined in JS for the letters P, O, D, R, M — each glyph is 7 strings of 5 characters, `#` = ink. `mask(word)` concatenates glyphs with a 1-column gap into a 7-row bitmap; unknown characters fall back to a solid block.

`outlineRows(mask, pad)` converts the bitmap into box-drawing strokes, one character per lit cell:
- horizontal neighbour AND vertical neighbour → `┼`
- horizontal neighbour only → `═`
- vertical neighbour only → `║`
- isolated → `▪`
This "continuous stroke" rule matters: an earlier edge-only version produced disconnected fragments and the wordmark was unreadable.

**Hero decode animation** (per frame): for every non-space cell, compute `p = (t * 0.55 - x * 0.012) % 1`. If `p < 0.42` the cell renders a random noise glyph from `"▒░#%*+=-"` (seeded by a deterministic `hash(x, y, floor(t*14))`), otherwise it renders its final box character. The `- x * 0.012` term makes the resolve sweep left→right; the cycle repeats forever.

**Subtitle typing**: `n = floor(((t * 0.55) % 1) * (word.length + 10))`, sliced from "POWERED BY MZX" — synced to the same cycle as the decode, with a pause at full length.

**Index sparklines** (per frame): for each index a 44-point series is generated from `sin(x*0.21+seed)*0.5 + sin(x*0.07+seed*2)*0.35 + (hash-0.5)*0.3` where `x = floor(t*1.2) + k`, so the series scrolls one point at a time. The last point drives value and % change off a base level (SPX 6412.88 ±9, IXIC 21038.41 ±34, CSI300 4127.60 ±12, N225 41892.30 ±130, XIU 38.74 ±0.16). Series is normalised to the block-bar ramp `▁▂▃▄▅▆▇█`. **This is simulated data** — replace with a real quote API (and keep the caption honest either way).

### Loop mechanics
One `requestAnimationFrame` loop drives everything; elapsed seconds are multiplied by a `speed` prop (default 1). Each tick writes `textContent` on the refs — **never** re-renders the component tree. Preserve this: text-only writes at 60fps are cheap; re-rendering React 60 times a second is not. In React, run the loop in a `useEffect` with `cancelAnimationFrame` cleanup, writing to refs directly.

### Other behavior
- `html { scroll-behavior: smooth }`; all nav links are in-page anchors.
- Buttons/links: hover tint and `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` come from the Nocturne stylesheet — don't restyle per component.
- Respect `prefers-reduced-motion`: currently NOT handled. Add it — freeze the decode at its resolved state, stop the floor scroll, show the subtitle in full.

## State Management
Minimal. Local component state only:
- `t` — elapsed animation time (kept in the rAF closure, not React state).
- `speed` — number, default 1, multiplies elapsed time.
- `subtitle` — string, default "POWERED BY MZX".
No routing, no data fetching today. Real data would come from: a quotes API (Market), the GitHub REST API for repos + notes (Github, Course Notes), and a static asset manifest or CMS (Photos).

## Responsive behavior
Not yet designed for small screens. Known work: hero `font-size` clamp already scales; the header nav needs a mobile treatment (the four labels won't fit under ~600px); section padding `120px 56px` should reduce (~72px 24px); the GitHub 4-column row grid must collapse to two lines; the photo grid's 2×2 hero tile should become 1×1. Ask before inventing these — they were never reviewed.

## Design Tokens
From Nocturne (`_ds/nocturne-…/styles.css`) — always use the variables, not the literals:
- `--color-bg` #161826 · page ground; the site itself paints #0f101c with section variants #12131f and the hero gradient #171a2e → #0f101c → #0b0c14
- `--color-text` #e9e9ed
- `--color-accent` #9184d9, with a 100–900 ramp; used here at 300 (small accent text), 400 (sparklines), 800 (borders as `--color-neutral-800`)
- Neutral ramp `--color-neutral-100…900`: 300/400/500 for muted text, 600 for hairline rules, 800 for borders
- Raw accent alphas used in the hero grid: `rgba(145,132,217, .4 / .32 / .7 / .5 / .06)`
- Type: `--font-heading` / `--font-body` = Inter; **JetBrains Mono 300/400/700** (Google Fonts) is added by this design for all ASCII, labels and numerics
- Headings never go past weight 500 — hierarchy is size and space
- Spacing: `--space-*` (density 0.70×); this page also uses literal section padding 120px/56px
- Radius: `--radius-sm/md` (8px base) · Shadow: `--shadow-sm/md/lg`, and `.elev-sm` on cards

### Nocturne rules to preserve
1. Primary buttons are **outlined**, never flooded with accent.
2. Rules fade to transparent at their ends (48px+ per side) rather than stopping hard.
3. No pure black or pure white.
4. Photographs go through `.lighten` and should be shot on dark backgrounds.
5. Keep chroma low outside the single accent.

## Assets
- **Fonts**: Inter (from the design system) and JetBrains Mono 300/400/700 via Google Fonts.
- **Photos**: none supplied. Five slots in the Photos section await real images (dark-background photography).
- **Icons**: none used yet; Nocturne specifies Phosphor Icons if any are added.
- No raster or SVG assets otherwise — every graphic on the page is CSS gradients or generated text.

## Open questions for the user
1. Real copy for Market cards / repos / note titles — the current text is placeholder.
2. Which GitHub repo holds the course notes, and how they should be listed and linked.
3. Whether market data should be live (which provider) or stay a decorative simulation.
4. Real photographs for the Photos grid.
5. Mobile/responsive treatment (not designed).

## Files
- `PodorM Site.dc.html` — the site (markup + animation logic).
- `PodorM Banners.dc.html` — hero explorations 1a–1e and motion studies 2a–2e (reference).
- `nocturne/styles.css` — the design system stylesheet (tokens + components).
- `nocturne/readme.md` — the design system guide.
- `image-slot.js` — the drag-and-drop image placeholder used in the prototype's Photos grid; not needed in production.
