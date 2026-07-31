# True Paginated Pages — Design

Date: 2026-07-31
Status: Approved (design)

## Problem

Exported PDFs and the editor preview disagree, and multi-page PDFs render page 2+
with no top/bottom padding. Both symptoms share one root cause:

CV content is rendered as a single continuous `<article>` (the `CvPage` wrapper).
Padding lives only at the document's outer edges (template `p-10`/`p-12` classes and
`@page { margin: 0 }`), so any *internal* page break inherits no padding. Meanwhile
the preview only draws dashed **overlay lines** at computed break positions — it never
inserts a real page gap or padding, so it structurally cannot match the PDF.

## Goal

Render CV content into real A4 page boxes (`794×1123px` @96dpi), each with its own
padding, in BOTH the preview and the print route. Force a page break between boxes so:

- Preview and PDF are pixel-identical (WYSIWYG).
- Page 2+ gets correct top/bottom padding.
- Full-bleed sidebar templates keep their colored band reaching the paper edge.

## Approach: measure & transform-slice

Take the A4 frame out of the templates and give it to a shared `Paginator`.
Templates render only their content; the `Paginator` slices that content into discrete
A4 page boxes.

Flow:

1. Render template content once into a hidden measurement layer.
2. Reuse the existing block-collection + `computePageBreaks` logic (from
   `use-cv-page-breaks.ts` / `page-breaks.ts`) to compute break offsets. Adjust the
   usable per-page content height to `1123 − paddingTop − paddingBottom` so blocks
   never land under the padding.
3. Render N page boxes. Each box is `overflow: hidden` and padded; inside, the *same*
   content is `translateY`-offset so each box shows only its slice. Because the break
   algorithm guarantees no block straddles a boundary, no content is visually cut.

Why transform-slice instead of physically distributing DOM nodes into pages: it is
**template-agnostic**. Works identically for single-column (classic) and two-column
sidebar (modern) templates without rebuilding any template layout — a reliability win
across all 9 templates.

### Slicing coordinate model

Each page box is `794×1123`. Inside it sits a **clip viewport** that is inset by the
template padding on all sides: width `794 − 2·paddingX`, height `1123 − 2·paddingY`,
positioned at `(paddingX, paddingY)`, with `overflow: hidden`. Inside the viewport the
full content is rendered once at width `794 − 2·paddingX` and translated by
`translateY(−offset_k)` for page `k`, where `offset_k` is the cumulative content height
consumed by pages `0..k−1`.

Critical consequence for measurement: because content is laid out at the **padded content
width** (`794 − 2·paddingX`), break computation must measure at that same width — not the
full 794. So the measurement layer uses the content width, and `computePageBreaks` runs
against usable page height `1123 − 2·paddingY`. Padding is therefore NOT part of the
translated content (it lives on the viewport inset), so it stays fixed on every page and
never scrolls away.

### Two-column templates: guillotine cut (decided)

Transform-slice translates both columns together by one `translateY`, so break positions
must be a **horizontal guillotine cut** safe for BOTH columns simultaneously: block
collection gathers blocks from every column (not just the linear flow), and
`computePageBreaks` picks Y-positions that avoid cutting any block in any column.

Trade-off accepted: when the two columns' block edges don't align, a page may end with
extra whitespace. Rejected alternative — per-column pagination — packs tighter but
requires the Paginator to know each template's column structure, destroying the
template-agnostic property that motivated transform-slice.

## Part A — Full-bleed sidebar padding

The colored sidebar/gradient band must reach the top/bottom paper edge, but text inside
it needs page padding. So padding cannot live on the page box (that would inset the
band). Split the two concerns per page box:

- **Background layer**: the gradient/sidebar band is painted on the page box itself,
  edge-to-edge (`794×1123`), so color always bleeds to the paper edge.
- **Content layer**: padding lives on an inner wrapper inside the sliced content, not on
  the box.

A4 padding + background become a per-template descriptor in the template registry,
alongside `lazyComponent`/`eagerComponent`:

```ts
{ padding: { x: 40, y: 48 }, background?: (cv) => CSSProperties }
```

- Bordered templates (classic, minimal, fresh-graduate): `background` undefined → white
  box; padding applied to content.
- Sidebar templates (modern, creative, executive, elegant, professional, compact):
  `background` returns the gradient → painted on every page box edge-to-edge; padding
  still applied to content so page-2 text clears the top.

Templates stop carrying `p-10`/`p-12` on `CvPage`; that value moves into the descriptor.

## Part B — Print-route measurement

The preview measures in the browser. The print route runs in headless Chromium, which
can also measure, but `page.pdf()` must fire only after layout settles.

- `Paginator` runs measurement in `useLayoutEffect` + re-measures on
  `document.fonts.ready`, then sets a ready flag: `data-paginated="true"` on the root.
- `pdf.ts` adds `await page.waitForSelector('[data-paginated="true"]')` before
  `page.pdf()`.

`@page { margin: 0 }` stays. Margins now come from inside each box, so full-bleed still
works and page 2 gets real padding. Each box is exactly `1123px` with `break-after: page`
between boxes.

Note: text stays real selectable text (not rasterized) — it is just positioned per box.

## Files touched

- `features/cv/components/templates/shared.tsx` — `CvPage` no longer owns padding; add
  descriptor plumbing / keep a thin content wrapper.
- `features/cv/components/templates/*.tsx` — drop `p-*` from `CvPage`, move gradient to
  descriptor `background`.
- `features/cv/components/templates/index` (registry) — add `padding` + `background` per
  template.
- NEW `features/cv/components/cv-paginator.tsx` — shared `Paginator` (measure + slice +
  render page boxes + ready flag).
- `features/cv/components/cv-preview.tsx` — render via `Paginator`; drop dashed overlay
  lines (real page gaps replace them).
- `app/(dashboard)/builder/[cvId]/print/page.tsx` — render via `Paginator`.
- `features/cv/lib/pdf.ts` — wait for `[data-paginated="true"]` before `page.pdf()`.
- `features/cv/hooks/use-cv-page-breaks.ts` / `lib/page-breaks.ts` — reuse; extend usable
  height to account for padding. Overlay-only hook usage retired.

## Non-goals

- No redesign of individual template visuals.
- No change to CV data schema, store, or autosave.
- No change to the export trigger / auth-gated print route contract.

## Testing

- Seed CV ("Budi Santoso", classic) overflows to page 2 — verify page 2 has top padding
  in both preview and PDF, and they match.
- Verify a full-bleed sidebar template (modern) — sidebar band reaches top/bottom edge on
  every page while text is padded.
- Verify single-page CV is unaffected (one box, no forced break).
- `bun build` + `bun lint` clean.
