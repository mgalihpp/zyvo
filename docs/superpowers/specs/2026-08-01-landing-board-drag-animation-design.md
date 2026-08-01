# Landing Page — Job Tracker Board Mock: Drag Animation

Date: 2026-08-01
Status: Approved

## Goal

Polish the landing-page Job Tracker board mock (`BoardMock` in
`features/marketing/components/job-tracker-showcase.tsx`). Two changes:

1. **Fix ring clipping.** The current spotlight card's `ring-2` gets clipped by
   the board container's `overflow-hidden` + padding along the "Dilamar" edge.
2. **Replace the pulsing spotlight with a drag animation.** Cards should look
   like they're being dragged one column forward on a loop — "biar keren."

Fully self-contained: no store, no tRPC — safe on the public landing page.

## Fix #1 — ring clipping

The columns row sits flush against the `overflow-hidden` container edge, so a
card's ring/shadow on the leftmost column ("Dilamar") gets cut off.

Fix: give the horizontal scroll row inner breathing room so rings and the
lifted drag card's shadow never touch the clip edge — add `px-1 -mx-1` (or
equivalent padding) to the `flex ... overflow-x-auto` row inside `BoardMock`.
Verify the leftmost column's ring renders fully.

## Fix #2 — drag animation

### Behavior

- Remove the spotlight entirely: delete `useCycle`, `FLAT_CARDS`, and the
  `active`/`mock-pulse` treatment on `MockCardBody`.
- On a repeating loop (~2.6s/cycle), a **different card each cycle** performs a
  **one-column-forward hop** (Dilamar→Interview→Offer→Diterima). Rotate through
  a hand-picked sequence of source cards so movement feels varied and alive.
  Hops are always forward (reads as funnel progress); never backward.

### Technique — floating overlay (no reflow)

The real board stays visually static. A single absolutely-positioned **floating
clone** of the active card animates over the top of it.

- Each rendered `MockCardBody` is measurable via a ref map keyed
  `"{colIndex}-{cardIndex}"`. The board container is `position: relative` and
  holds a ref.
- Per cycle, pick the source card + destination column. Using
  `getBoundingClientRect` relative to the container, measure the source card's
  rect and a destination anchor (top of the target column's card list, offset
  for existing cards). This adapts to responsive column widths (`w-52`/`w-56`)
  and variable card heights — no hardcoded geometry.
- Render the floating clone at the source rect, then transition its
  `transform: translate(dx, dy)` to the destination over ~900ms with an
  ease-out curve (e.g. `cubic-bezier(0.16, 1, 0.3, 1)`). Positions are dynamic,
  so this is an inline-style transform transition, not a static keyframe.

### Visual treatment — lift & glide + grabbing hand

- Floating clone while traveling: `scale(1.05)`, subtle `rotate(-2deg)` tilt,
  stronger shadow (`shadow-lg`/`shadow-xl`), slightly reduced opacity — the
  "picked up" feel.
- Source card dims to a **dashed ghost placeholder** while its clone is in
  flight (opacity down + `border-dashed`), so the gap stays and nothing
  reflows.
- A small **grabbing-hand glyph** (lucide `Hand` / `GrabIcon`) sits at the
  clone's corner and rides along with it.
- On arrival: the floating clone fades out; optionally the destination shows a
  brief settle (`mock-pop`) where the card lands. Then reset for the next
  cycle. Keep the board's own card counts static (visual mock — counts don't
  need to change).

### New CSS

- One `@keyframes mock-drag-cursor` in `app/globals.css` for a tiny grab bob on
  the hand glyph (subtle scale/translate). The card travel itself is JS-driven
  inline transform, not a keyframe.

### Reduced motion & safety

- If `prefers-reduced-motion: reduce`, skip the animation entirely and render
  the static board (current behavior). Reuse the existing `matchMedia` pattern.
- Measurement runs after mount (`useEffect`/`useLayoutEffect`), guarded so it's
  inert during SSR and no-ops if refs aren't ready.
- No store/tRPC access. Component stays a self-contained client mock.

## Files touched

- `features/marketing/components/job-tracker-showcase.tsx` — rewrite
  `BoardMock` and `MockCardBody`; drop `useCycle`/`FLAT_CARDS`; add the
  floating-overlay drag logic and grabbing-hand glyph.
- `app/globals.css` — add `@keyframes mock-drag-cursor`.

## Out of scope

- No real drag-and-drop, no DOM reflow, no column re-counting.
- No changes to the in-app Kanban board or `BoardPreview`.
- No changes to feature highlights, funnel card, or CTA.
