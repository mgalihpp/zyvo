# True Paginated Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render CV content into real A4 page boxes (794×1123px each) in both the editor preview and the print route, so preview and PDF are pixel-identical and page 2+ gets proper top/bottom spacing.

**Architecture:** A shared client `CvPaginator` renders the template once into a hidden measurement layer, computes guillotine-safe page breaks from measured blocks, then renders N fixed-size page boxes each showing a clipped, `translateY`-offset window of the same content. Sidebar templates paint their gradient edge-to-edge on every box via a registry descriptor. Puppeteer waits for a `data-paginated="true"` flag before capturing.

**Tech Stack:** Next.js 16 App Router, React 19.2 (React Compiler on), Tailwind v4, Puppeteer-core. Spec: `docs/superpowers/specs/2026-07-31-true-paginated-pages-design.md`.

## Global Constraints

- Package manager/runner is `bun` (`bun lint`, `bun build`, `bun scripts/...`).
- Lint/format is Biome v2 (`bun lint` must stay clean).
- A4 geometry: 794×1123 px @96dpi. Constant `A4_PAGE_HEIGHT_PX = 1123` already exists in `features/cv/lib/page-breaks.ts`.
- Templates must NOT change visually. Only `modern.tsx`/`creative.tsx` swap an inline gradient string for an imported constant (same string).
- There is no test framework; unit checks are node-assert scripts under `scripts/` run with `bun scripts/<name>.ts`.
- All UI copy is Indonesian; code comments may be Indonesian or English (match surrounding file).

---

### Task 1: Guillotine page breaks with per-page heights

**Files:**
- Modify: `features/cv/lib/page-breaks.ts`
- Test: `scripts/page-breaks-check.ts`

**Interfaces:**
- Produces: `computePageBreaks(blocks: PageBlock[], heights?: number | PageHeights): number[]` and `interface PageHeights { first: number; rest: number }`. Returned numbers are content-Y positions where pages 2..N start. Blocks MAY overlap vertically (two-column templates); a break never lands strictly inside any block unless a block is taller than a page (hard cut).

The current implementation assumes non-overlapping, document-ordered blocks. Two-column templates produce vertically **overlapping** blocks (sidebar vs main column), so the algorithm becomes a guillotine cut: a candidate break slides upward past every block interior it would cut. It also gains per-page usable heights, because page 1 (template supplies its own top spacing) and continuation pages (need a reserved top inset) have different capacities.

- [ ] **Step 1: Add failing test cases to the existing self-check script**

Append to `scripts/page-breaks-check.ts` (keep all existing asserts — they must still pass):

```ts
// --- Guillotine (blok dua kolom yang tumpang tindih vertikal) ---

// Blok sidebar (kiri) dan main (kanan) tumpang tindih: cut harus aman
// untuk KEDUA kolom -> naik ke 1000 (top blok sidebar), bukan 1100.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 900 }, // main #1
    { top: 1000, height: 400 }, // sidebar #1 (menghalangi cut 1123)
    { top: 1100, height: 400 }, // main #2 (menghalangi cut 1123 juga)
  ]),
  [1000],
);

// Per-page heights: halaman 1 muat 1083, halaman lanjutan 1043.
assert.deepEqual(
  computePageBreaks(
    [
      { top: 0, height: 1000 },
      { top: 1000, height: 1000 },
      { top: 2000, height: 1000 },
    ],
    { first: 1083, rest: 1043 },
  ),
  [1000, 2000],
);

// Cut yang mundur melewati rantai blok overlapping berantai.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 700 },
    { top: 600, height: 500 }, // overlap dengan blok pertama
    { top: 1050, height: 200 }, // overlap dengan blok kedua
  ]),
  [600],
);
```

- [ ] **Step 2: Run to verify new asserts fail**

Run: `bun scripts/page-breaks-check.ts`
Expected: AssertionError on the first new case (old greedy picks a cut inside an overlapping block or returns a different value).

- [ ] **Step 3: Rewrite `computePageBreaks` as guillotine with `PageHeights`**

Replace the function in `features/cv/lib/page-breaks.ts` (keep `A4_PAGE_HEIGHT_PX` and `PageBlock` exports as-is):

```ts
export interface PageHeights {
  /** Tinggi konten yang muat di halaman 1 (px). */
  first: number;
  /** Tinggi konten yang muat di halaman 2+ (px). */
  rest: number;
}

/**
 * Guillotine pagination: memilih posisi cut horizontal yang aman untuk SEMUA
 * blok sekaligus (blok boleh tumpang tindih vertikal — template dua kolom).
 * Kandidat cut di batas halaman digeser NAIK melewati setiap interior blok
 * yang akan terpotong. Blok lebih tinggi dari satu halaman -> hard cut di
 * batas halaman. Mengembalikan posisi y (koordinat konten) awal tiap halaman
 * 2..N.
 */
export function computePageBreaks(
  blocks: PageBlock[],
  heights: number | PageHeights = A4_PAGE_HEIGHT_PX,
): number[] {
  const h: PageHeights =
    typeof heights === "number" ? { first: heights, rest: heights } : heights;
  const end = blocks.reduce((m, b) => Math.max(m, b.top + b.height), 0);
  const breaks: number[] = [];
  let pageStart = 0;
  let usable = h.first;
  while (pageStart + usable < end) {
    const limit = pageStart + usable;
    // Geser cut naik sampai tidak memotong interior blok mana pun.
    let cut = limit;
    let moved = true;
    while (moved) {
      moved = false;
      for (const b of blocks) {
        if (b.top < cut && cut < b.top + b.height && b.top > pageStart) {
          cut = b.top;
          moved = true;
        }
      }
    }
    // Tidak ada cut aman (blok lebih tinggi dari halaman): hard cut di limit.
    if (cut <= pageStart) cut = limit;
    breaks.push(cut);
    pageStart = cut;
    usable = h.rest;
  }
  return breaks;
}
```

Note the `b.top > pageStart` guard: a block that already started on (or before) the current page top cannot pull the cut to or above `pageStart`; such a block is being hard-cut by necessity, matching the old taller-than-page behavior.

- [ ] **Step 4: Run all asserts**

Run: `bun scripts/page-breaks-check.ts`
Expected: `page-breaks: ok` — all old AND new asserts pass. If an OLD assert fails, the rewrite broke back-compat; fix the algorithm, not the test.

- [ ] **Step 5: Commit**

```bash
git add features/cv/lib/page-breaks.ts scripts/page-breaks-check.ts
git commit -m "feat: guillotine page breaks with per-page usable heights"
```

---

### Task 2: DOM block measurement library

**Files:**
- Create: `features/cv/lib/measure-blocks.ts`
- Modify: `features/cv/hooks/use-cv-page-breaks.ts` (delegate to the new lib)

**Interfaces:**
- Consumes: `PageBlock` from `features/cv/lib/page-breaks.ts`.
- Produces: `collectArticleBlocks(root: HTMLElement): PageBlock[]` — measures the `<article>` inside `root` (or `root` itself) and returns atomic blocks in content coordinates (px, scale-normalized to 794px width). **Key change vs the old hook:** a horizontal multi-column container **taller than one page** is no longer atomic — we recurse into each column so both columns contribute blocks (guillotine input). Short multi-col rows (e.g. name/date flex rows) stay atomic.

There is no DOM test environment; this task is verified by lint/build plus the end-to-end check in Task 7. Keep functions small and mirror the proven logic from `use-cv-page-breaks.ts`.

- [ ] **Step 1: Create `features/cv/lib/measure-blocks.ts`**

```ts
import { A4_PAGE_HEIGHT_PX, type PageBlock } from "./page-breaks";

const PAGE_WIDTH_PX = 794;

/** Container multi-kolom horizontal (2+ kolom sejajar). */
function isHorizontalMultiCol(el: HTMLElement): boolean {
  const children = [...el.children].filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  );
  if (children.length < 2) return false;
  const a = children[0].getBoundingClientRect();
  const b = children[1].getBoundingClientRect();
  return Math.abs(a.top - b.top) < 1 && b.left >= a.right - 1;
}

/** Satu section jadi blok: lead (heading + entri pertama) + entri selanjutnya. */
function sectionBlocks(section: HTMLElement, top: number): PageBlock[] {
  const sRect = section.getBoundingClientRect();
  const entries = [
    ...section.querySelectorAll<HTMLElement>("[data-entry]"),
  ].sort(
    (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
  );
  if (entries.length === 0) {
    return [{ top: sRect.top - top, height: sRect.height }];
  }
  const first = entries[0].getBoundingClientRect();
  const blocks: PageBlock[] = [
    { top: sRect.top - top, height: first.bottom - sRect.top },
  ];
  for (let i = 1; i < entries.length; i++) {
    const r = entries[i].getBoundingClientRect();
    blocks.push({ top: r.top - top, height: r.height });
  }
  return blocks;
}

/**
 * Walk DOM. Multi-kolom PENDEK (baris flex judul/tanggal) = satu blok atomik;
 * multi-kolom TINGGI (grid sidebar setinggi halaman) di-recurse per kolom
 * supaya kedua kolom menyumbang blok (input guillotine).
 */
function collect(el: HTMLElement, top: number, blocks: PageBlock[]): void {
  for (const child of [...el.children].filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  )) {
    if (isHorizontalMultiCol(child)) {
      const r = child.getBoundingClientRect();
      if (r.height <= A4_PAGE_HEIGHT_PX / 2) {
        blocks.push({ top: r.top - top, height: r.height });
        continue;
      }
      // Kolom tinggi: turun ke tiap kolom.
      for (const col of [...child.children].filter(
        (c): c is HTMLElement => c instanceof HTMLElement,
      )) {
        collect(col, top, blocks);
      }
      continue;
    }
    if (child.tagName === "SECTION") {
      blocks.push(...sectionBlocks(child, top));
      continue;
    }
    collect(child, top, blocks);
  }
}

/**
 * Ukur blok atomik artikel di dalam `root` (koordinat konten, dinormalkan ke
 * lebar 794px). Dipakai paginator preview & print.
 */
export function collectArticleBlocks(root: HTMLElement): PageBlock[] {
  const article = root.querySelector("article") ?? root;
  const aRect = article.getBoundingClientRect();
  const scale = aRect.width / PAGE_WIDTH_PX || 1;
  const blocks: PageBlock[] = [];
  collect(article as HTMLElement, aRect.top, blocks);
  if (blocks.length === 0) {
    blocks.push({ top: 0, height: aRect.height / scale });
  }
  for (const b of blocks) {
    b.top /= scale;
    b.height /= scale;
  }
  return blocks;
}

/** Tinggi konten artikel (px, dinormalkan ke lebar 794px). */
export function measureArticleHeight(root: HTMLElement): number {
  const article = root.querySelector("article") ?? root;
  const aRect = article.getBoundingClientRect();
  const scale = aRect.width / PAGE_WIDTH_PX || 1;
  return aRect.height / scale;
}
```

Note vs the old hook: the top-level `isHorizontalMultiCol(article)` short-circuit (whole article = one block) is gone — the recursion now handles tall grids per-column, and a section-less fallback pushes one full-height block.

- [ ] **Step 2: Delegate `use-cv-page-breaks.ts` to the new lib**

Replace the file's private helpers with imports so there is one measurement implementation (the hook still powers the current overlay until Task 5 removes it):

```ts
"use client";

import { type RefObject, useLayoutEffect, useState } from "react";
import { collectArticleBlocks } from "@/features/cv/lib/measure-blocks";
import {
  A4_PAGE_HEIGHT_PX,
  computePageBreaks,
} from "@/features/cv/lib/page-breaks";

/**
 * Mengembalikan posisi y (px, relatif ke top artikel, non-zoom) tiap page
 * break. Re-measure otomatis: saat font web siap dan saat artikel berubah
 * ukuran (ResizeObserver).
 */
export function useCvPageBreaks(
  articleRef: RefObject<HTMLElement | null>,
): number[] {
  const [breaks, setBreaks] = useState<number[]>([]);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const measure = () =>
      setBreaks(computePageBreaks(collectArticleBlocks(article), A4_PAGE_HEIGHT_PX));
    measure();
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    const ro = new ResizeObserver(measure);
    ro.observe(article);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [articleRef]);

  return breaks;
}
```

- [ ] **Step 3: Verify lint + typecheck**

Run: `bun lint` then `bun build`
Expected: both clean. (`bun build` is the typecheck; there is no separate tsc script.)

- [ ] **Step 4: Commit**

```bash
git add features/cv/lib/measure-blocks.ts features/cv/hooks/use-cv-page-breaks.ts
git commit -m "refactor: extract DOM block measurement into lib, recurse tall multi-column grids"
```

---

### Task 3: Registry pagination descriptor + shared gradient constants

**Files:**
- Create: `features/cv/components/templates/page-backgrounds.ts`
- Modify: `features/cv/components/templates/registry.ts`
- Modify: `features/cv/components/templates/index.ts`
- Modify: `features/cv/components/templates/modern.tsx:20-23`
- Modify: `features/cv/components/templates/creative.tsx:14-17`

**Interfaces:**
- Produces: `interface TemplatePagination { continuationTop?: number; bottom?: number; pageBackground?: string }` on `TemplateMeta.pagination` (optional); constants `MODERN_PAGE_BACKGROUND`, `CREATIVE_PAGE_BACKGROUND` (CSS background strings using `var(--cv-color-*)`).
- Consumed by: Task 4's `CvPaginator` and Tasks 5–6 (which read `getTemplate(id).pagination`).

- [ ] **Step 1: Create `features/cv/components/templates/page-backgrounds.ts`**

```ts
/**
 * Background full-bleed per halaman untuk template sidebar. Dipakai DUA
 * tempat: inline style template (halaman 1 / konten) dan descriptor
 * `pagination.pageBackground` di registry (kotak halaman 2+). Satu konstanta
 * supaya keduanya tidak pernah drift.
 */
export const MODERN_PAGE_BACKGROUND =
  "linear-gradient(to right, var(--cv-color-accent) 34%, var(--cv-color-bg) 34%)";

export const CREATIVE_PAGE_BACKGROUND =
  "linear-gradient(to right, var(--cv-color-accent) 40%, var(--cv-color-bg) 40%)";
```

- [ ] **Step 2: Add `TemplatePagination` to `registry.ts`**

In `features/cv/components/templates/registry.ts`, below the `TemplateCategoryMeta` block, add:

```ts
/**
 * Metadata pagination per-template untuk CvPaginator. Semua field opsional;
 * default: continuationTop 40, bottom 40, pageBackground kosong (kotak putih
 * pakai --cv-color-bg).
 */
export interface TemplatePagination {
  /** Inset atas konten (px) di halaman 2+. */
  continuationTop?: number;
  /** Ruang bawah (px) yang direservasi algoritma break di tiap halaman. */
  bottom?: number;
  /** Background full-bleed yang dilukis di SETIAP kotak halaman. */
  pageBackground?: string;
}
```

And extend `TemplateMeta` with the new optional field:

```ts
export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  categories: TemplateCategory[];
  lazyComponent: LazyExoticComponent<ComponentType<TemplateProps>>;
  /** Metadata pagination (lihat TemplatePagination). */
  pagination?: TemplatePagination;
}
```

(Keep the existing doc comment on `lazyComponent`.)

- [ ] **Step 3: Wire descriptors in `index.ts`**

In `features/cv/components/templates/index.ts`, import the constants:

```ts
import {
  CREATIVE_PAGE_BACKGROUND,
  MODERN_PAGE_BACKGROUND,
} from "./page-backgrounds";
```

Add to the `modern` entry: `pagination: { pageBackground: MODERN_PAGE_BACKGROUND },`
Add to the `creative` entry: `pagination: { pageBackground: CREATIVE_PAGE_BACKGROUND },`
All other templates get no `pagination` field (defaults apply). Also re-export the type at the bottom alongside the existing type exports:

```ts
export type {
  TemplateCategory,
  TemplateMeta,
  TemplatePagination,
} from "./registry";
```

- [ ] **Step 4: Swap inline gradients for the constants**

`modern.tsx` — replace the inline string (add `import { MODERN_PAGE_BACKGROUND } from "./page-backgrounds";`):

```tsx
      style={{ background: MODERN_PAGE_BACKGROUND }}
```

`creative.tsx` — same with `CREATIVE_PAGE_BACKGROUND`.

- [ ] **Step 5: Verify**

Run: `bun lint` then `bun build`
Expected: clean. Visually nothing changed (same strings).

- [ ] **Step 6: Commit**

```bash
git add features/cv/components/templates/page-backgrounds.ts features/cv/components/templates/registry.ts features/cv/components/templates/index.ts features/cv/components/templates/modern.tsx features/cv/components/templates/creative.tsx
git commit -m "feat: per-template pagination descriptor with shared page backgrounds"
```

---

### Task 4: CvPaginator component

**Files:**
- Create: `features/cv/components/cv-paginator.tsx`

**Interfaces:**
- Consumes: `collectArticleBlocks`, `measureArticleHeight` (Task 2); `computePageBreaks`, `A4_PAGE_HEIGHT_PX`, `PageHeights` (Task 1); `TemplatePagination` (Task 3).
- Produces: `CvPaginator({ children, pagination, pageGapClass }: { children: ReactNode; pagination?: TemplatePagination; pageGapClass?: string })` — client component. Renders `children` (a template element) once hidden for measurement, then one 794×1123 box per page. Root carries `data-paginated="true"` once measurement has run (Puppeteer wait target). Boxes get inline `breakAfter: "page"` except the last.

Slicing model (from the spec): each box clips a content window positioned at `top = inset` (`0` on page 1, `continuationTop` on 2+) with height = exactly this page's content span, containing the full-width content translated by `-start`. Clipping (not masking) prevents the previous/next page's content from bleeding into the reserved top/bottom areas.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import {
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { TemplatePagination } from "@/features/cv/components/templates/registry";
import { collectArticleBlocks, measureArticleHeight } from "@/features/cv/lib/measure-blocks";
import { A4_PAGE_HEIGHT_PX, computePageBreaks } from "@/features/cv/lib/page-breaks";

const PAGE_WIDTH_PX = 794;
const DEFAULT_CONTINUATION_TOP = 40;
const DEFAULT_BOTTOM = 40;

interface Layout {
  /** Posisi y konten tempat tiap halaman dimulai (halaman 1 = 0). */
  starts: number[];
  /** Tinggi total konten (px). */
  contentHeight: number;
}

/**
 * Membelah konten CV menjadi kotak halaman A4 sungguhan (794x1123) — dipakai
 * preview DAN print route supaya keduanya identik piksel. Konten dirender dua
 * kali: sekali tersembunyi untuk diukur, lalu sekali per halaman dengan window
 * clip + translateY. `data-paginated="true"` menandai pengukuran selesai
 * (ditunggu Puppeteer sebelum page.pdf()).
 */
export function CvPaginator({
  children,
  pagination,
  pageGapClass = "",
}: {
  children: ReactNode;
  pagination?: TemplatePagination;
  pageGapClass?: string;
}) {
  const continuationTop = pagination?.continuationTop ?? DEFAULT_CONTINUATION_TOP;
  const bottom = pagination?.bottom ?? DEFAULT_BOTTOM;
  const pageBackground = pagination?.pageBackground;

  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const measure = () => {
      const blocks = collectArticleBlocks(root);
      const breaks = computePageBreaks(blocks, {
        first: A4_PAGE_HEIGHT_PX - bottom,
        rest: A4_PAGE_HEIGHT_PX - continuationTop - bottom,
      });
      setLayout({
        starts: [0, ...breaks],
        contentHeight: measureArticleHeight(root),
      });
    };
    measure();
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [continuationTop, bottom]);

  // Sebelum pengukuran selesai: render satu kotak halaman 1 (tanpa flag).
  const starts = layout?.starts ?? [0];
  const contentHeight = layout?.contentHeight ?? A4_PAGE_HEIGHT_PX;

  return (
    <div
      data-paginated={layout ? "true" : undefined}
      className={`relative flex flex-col items-center ${pageGapClass}`}
    >
      {/* Layer pengukuran: alur natural, tak terlihat, tak memengaruhi layout. */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 w-[794px]"
      >
        {children}
      </div>

      {starts.map((start, i) => {
        const inset = i === 0 ? 0 : continuationTop;
        const isLast = i === starts.length - 1;
        const windowHeight = isLast
          ? Math.min(contentHeight - start, A4_PAGE_HEIGHT_PX - inset)
          : starts[i + 1] - start;
        return (
          <div
            key={i}
            className="relative h-[1123px] w-[794px] shrink-0 overflow-hidden bg-[var(--cv-color-bg)] shadow-sm print:shadow-none print:[print-color-adjust:exact]"
            style={{
              background: pageBackground,
              breakAfter: isLast ? undefined : "page",
            }}
          >
            <div
              className="absolute inset-x-0 overflow-hidden"
              style={{ top: inset, height: windowHeight }}
            >
              <div
                className="w-[794px]"
                style={{ transform: `translateY(${-start}px)` }}
              >
                {children}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Implementation notes for the engineer:
- `children` is rendered N+1 times (1 hidden + N pages). React handles this fine; templates are pure render functions of `cv`.
- The Tailwind arbitrary values `h-[1123px]` / `w-[794px]` match `PAGE_WIDTH_PX`/`A4_PAGE_HEIGHT_PX`; `PAGE_WIDTH_PX` is intentionally unused in JSX (classes are static for Tailwind's scanner) — if Biome flags the unused constant, delete the constant, keep the classes.
- `style={{ background: pageBackground }}` overrides the `bg-[...]` class only when set (sidebar templates); otherwise the class paints the plain page color.
- The inner window uses `overflow-hidden` + explicit `height`, so content from adjacent pages can never bleed into the reserved top/bottom bands.

- [ ] **Step 2: Verify lint + typecheck**

Run: `bun lint` then `bun build`
Expected: clean (component not yet mounted anywhere).

- [ ] **Step 3: Commit**

```bash
git add features/cv/components/cv-paginator.tsx
git commit -m "feat: CvPaginator renders content into true A4 page boxes"
```

---

### Task 5: Preview renders true pages

**Files:**
- Modify: `features/cv/components/cv-preview.tsx`
- Delete: `features/cv/hooks/use-cv-page-breaks.ts`

**Interfaces:**
- Consumes: `CvPaginator` (Task 4), `getTemplate(templateId).pagination` (Task 3).

- [ ] **Step 1: Swap the overlay for the paginator in `cv-preview.tsx`**

Changes (rest of the file — store selectors, zoom, grab-to-pan, zoom pill — stays identical):

1. Remove imports of `useCvPageBreaks` and the `previewRef`/`pageBreaks` lines.
2. Add `import { CvPaginator } from "./cv-paginator";`
3. `getTemplate(templateId)` is already called; also read its `pagination`:

```tsx
  const template = getTemplate(templateId);
  const Template = template.lazyComponent;
```

4. Replace the previous inner block (the `previewRef` div containing `<Template …>` + the `pageBreaks.map(…)` overlay) with:

```tsx
            <div
              className="w-[794px]"
              style={cvRootStyle({ typography, colors: effectiveColors })}
            >
              <CvPaginator pagination={template.pagination} pageGapClass="gap-6">
                <Template cv={content} />
              </CvPaginator>
            </div>
```

(The comments about pinning to 794px WYSIWYG width can stay.)

- [ ] **Step 2: Delete the now-unused hook**

Delete `features/cv/hooks/use-cv-page-breaks.ts`. Then confirm nothing else imports it:

Run: `bun x biome check 2>$null; git grep -n "use-cv-page-breaks"`
Expected: no matches (besides docs/plans).

- [ ] **Step 3: Verify in the browser**

Run: `bun dev`, open the builder with the seed CV (classic, "Budi Santoso").
Expected: preview shows **separate white A4 cards with a gap** instead of one long sheet with dashed lines; page 2 content starts ~40px below the card's top edge; no entry is cut across cards. Switch template to **Modern**: every card shows the sidebar gradient reaching its top and bottom edges. Zoom and grab-to-pan still work.

- [ ] **Step 4: Lint + build**

Run: `bun lint` then `bun build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/cv-preview.tsx
git rm features/cv/hooks/use-cv-page-breaks.ts
git commit -m "feat: preview renders true paginated A4 pages"
```

---

### Task 6: Print route + PDF capture use the same pages

**Files:**
- Modify: `app/(dashboard)/builder/[cvId]/print/page.tsx`
- Modify: `features/cv/lib/pdf.ts:71-92`
- Modify: `app/globals.css` (the `[data-print-root]` break-rule block, ~lines 308–335)

**Interfaces:**
- Consumes: `CvPaginator` (Task 4) — a client component; the server print page passes the server-rendered template as `children` (standard RSC slot, no serialization issue). `getTemplate(id).pagination` (Task 3).
- Produces: print DOM = N boxes of exactly 794×1123px, root flagged `data-paginated="true"` when ready; `page.pdf` sized in px to match boxes exactly.

- [ ] **Step 1: Render via `CvPaginator` in the print page**

Replace the returned JSX in `app/(dashboard)/builder/[cvId]/print/page.tsx` (auth/ownership/data code above stays untouched):

```tsx
  const content = toCvContent(cv);
  const template = getTemplate(content.templateId);
  const Template = getEagerTemplate(content.templateId);

  return (
    <main
      data-print-root
      className="mx-auto w-[794px] bg-white"
      style={cvRootStyle(content)}
    >
      <CvPaginator pagination={template.pagination}>
        <Template cv={content} />
      </CvPaginator>
    </main>
  );
```

Add imports: `import { getTemplate } from "@/features/cv/components/templates";` and `import { CvPaginator } from "@/features/cv/components/cv-paginator";`. Note width changes from `210mm` to `794px` so it exactly matches the box width (210mm ≈ 794.6px would leave a sliver).

- [ ] **Step 2: Update `pdf.ts` — wait for pagination, capture in px**

In `renderCvDocument` after `page.goto(...)`, add:

```ts
    // Tunggu CvPaginator selesai mengukur & membelah halaman (client-side).
    await page.waitForSelector('[data-paginated="true"]', { timeout: 15_000 });
```

Then replace the `page.pdf` call and its comment:

```ts
    // Setiap halaman sudah berupa kotak 794x1123px dari CvPaginator dengan
    // break-after page. Ukuran pdf pakai px yang sama persis (bukan mm) agar
    // tidak ada selisih pembulatan 210mm≈794.6px yang menggeser break.
    const buf = await page.pdf({
      width: "794px",
      height: "1123px",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
```

The PNG branch stays as-is (fullPage screenshot now naturally shows the stacked page boxes).

- [ ] **Step 3: Retire the old flow-break CSS**

In `app/globals.css`, the `[data-print-root]` block of break rules (`section { break-inside: auto }`, `h1/h2/h3 { break-after: avoid }`, `[data-entry] { break-inside: avoid }`, `section { break-before: avoid }`, `section:first-child { break-before: auto }`) existed to steer Chromium's automatic flow pagination. Boxes are now pre-paginated and exactly one page tall, so these rules are dead. Replace that block with just:

```css
@media print {
  @page {
    margin: 0;
  }
}
```

(Keep whatever else lives around it untouched — only the `[data-print-root]` break rules go away. If `@page { margin: 0 }` already exists separately, keep that one occurrence.)

- [ ] **Step 4: End-to-end verify**

With `bun dev` running and the seed CV present:
1. Export the classic seed CV to PDF from the app UI.
2. Open the PDF: page 2 content must start ~40px below the top edge, no cut entries, page count matches the preview's card count, and each PDF page matches its preview card visually.
3. Switch the CV to Modern, export again: gradient band touches top/bottom edge of every PDF page; text on page 2 starts below the band's top edge.
Expected: preview cards and PDF pages are visually identical (same breaks, same spacing).

- [ ] **Step 5: Lint + build**

Run: `bun lint` then `bun build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/builder/[cvId]/print/page.tsx" features/cv/lib/pdf.ts app/globals.css
git commit -m "feat: print route and PDF capture use true paginated page boxes"
```

---

### Task 7: Full verification pass

**Files:**
- No new files; fixes only if checks fail.

- [ ] **Step 1: Unit checks**

Run: `bun scripts/page-breaks-check.ts`
Expected: `page-breaks: ok`

- [ ] **Step 2: Lint + production build**

Run: `bun lint` then `bun build`
Expected: both clean.

- [ ] **Step 3: Manual matrix**

With `bun dev`:
| Case | Expectation |
|------|-------------|
| Classic seed CV (2+ pages) | Preview cards == PDF pages; page 2 padded top & bottom |
| Modern (sidebar) | Gradient full-bleed on every page/card; text padded |
| Minimal (p-12) | Unchanged look on page 1; padded continuation |
| Near-empty CV (1 page) | Single card, single-page PDF, no regression |
| PNG export | Stacked page boxes captured, not a broken long sheet |

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: pagination verification fixes"
```

(Skip the commit if nothing changed.)
