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
   `use-cv-page-breaks.ts` / `page-breaks.ts`) to compute break offsets, with per-page
   usable heights that reserve the continuation-top and bottom spacing (see coordinate
   model below).
3. Render N page boxes. Each box is `overflow: hidden` and padded; inside, the *same*
   content is `translateY`-offset so each box shows only its slice. Because the break
   algorithm guarantees no block straddles a boundary, no content is visually cut.

Why transform-slice instead of physically distributing DOM nodes into pages: it is
**template-agnostic**. Works identically for single-column (classic) and two-column
sidebar (modern) templates without rebuilding any template layout — a reliability win
across all 9 templates.

### Slicing coordinate model

Each page box is `794×1123` with `overflow: hidden`. Inside, the full template content is
rendered at its normal **full 794px width** — templates keep their own padding, gradients
and flush headers completely unchanged. For page `k` the content is translated by
`translateY(−start_k + inset_k)`, where `start_k` is the content Y where page `k` begins
and `inset_k` is `0` for page 1 (the template's own layout supplies page-1 top spacing)
and `continuationTop` (per-template, default 40px) for pages 2+.

Bottom padding is reserved by the break algorithm, not by CSS: usable height is
`1123 − bottom` for page 1 and `1123 − continuationTop − bottom` for pages 2+.

For sidebar templates the box itself is painted with the template's edge-to-edge gradient
(`pageBackground`), so the `continuationTop` inset area on pages 2+ still shows the
colored band while text starts below it. Because content stays 794px wide, the gradient's
column split (34% / 40%) aligns between box background and translated content with no
math.

This means templates need **no structural changes** — pagination metadata
(`continuationTop`, `bottom`, `pageBackground`) lives in the template registry.

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
  edge-to-edge (`794×1123`), so color always bleeds to the paper edge on every page.
- **Content layer**: the template's own layout (unchanged) supplies horizontal padding;
  vertical padding on pages 2+ comes from the `continuationTop` inset and the
  algorithm-reserved `bottom` (see coordinate model above).

Pagination metadata becomes a per-template descriptor in the template registry,
alongside `lazyComponent`:

```ts
pagination?: {
  /** Top inset (px) applied to content on pages 2+. Default 40. */
  continuationTop?: number;
  /** Bottom space (px) reserved by the break algorithm on every page. Default 40. */
  bottom?: number;
  /** Edge-to-edge background painted on every page box (sidebar templates). */
  pageBackground?: string; // CSS background value
}
```

- Bordered templates (classic, minimal, fresh-graduate): no `pageBackground` → white
  box; template's own `p-10`/`p-12` stays as-is and continues to pad page 1 and both
  sides.
- Sidebar/band templates (modern, creative): `pageBackground` = their gradient →
  painted on every page box edge-to-edge; text on page 2+ starts below
  `continuationTop` but the band reaches the top edge.
- Header-band templates (professional, executive, elegant, compact): white
  `pageBackground` (default); their colored header only appears on page 1, which is
  correct.

Templates themselves are NOT modified (the gradient stays inline in the template for
page 1 continuity; the registry duplicates it for page boxes 2+ — one string per
template, kept adjacent via a shared constant to avoid drift).

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

- `features/cv/lib/page-breaks.ts` — extend `computePageBreaks` to accept per-page
  usable heights (page 1 vs continuation pages).
- `features/cv/hooks/use-cv-page-breaks.ts` — block collection reused by the new
  pagination hook; overlay-only usage retired.
- `features/cv/components/templates/registry.ts` + `index.ts` — add optional
  `pagination` descriptor per template.
- NEW `features/cv/components/cv-paginator.tsx` — shared `Paginator` (hidden
  measurement layer + slice + render page boxes + `data-paginated` ready flag).
- `features/cv/components/cv-preview.tsx` — render via `Paginator` with visible page
  gaps; drop dashed overlay lines.
- `app/(dashboard)/builder/[cvId]/print/page.tsx` — render via `Paginator` (client
  child) with zero gap + `break-after: page` per box.
- `features/cv/lib/pdf.ts` — wait for `[data-paginated="true"]` before `page.pdf()`.
- Templates: unchanged.

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
