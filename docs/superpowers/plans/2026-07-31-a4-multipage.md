# A4 Multi-Halaman Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CV yang melebihi satu halaman ter-export jadi PDF A4 multi-halaman, preview editor menampilkan garis batas halaman presisi, dan semua template (sekarang + masa depan) konsisten via wrapper A4 bersama.

**Architecture:** Perbaiki `pdf.ts` agar Chromium paginate ke halaman A4 asli (bukan 1 halaman panjang). Tambah wrapper `CvPage` bersama + konvensi `data-entry` di semua template agar break rules dan pengukuran preview berfungsi. Buat algoritma pagination murni (pure) yang ditest lewat self-check bun, dan hook React yang mengukur DOM + menggambar garis batas di preview.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Biome v2, Puppeteer-core, bun (untuk menjalankan self-check TS).

## Global Constraints

- Perintah pakai `bun`: `bun lint`, `bun build`, `bun format`, `bun scripts/<file>.ts`.
- Dimensi A4 @96dpi: lebar **794px**, tinggi **1123px**; PDF `210mm × 297mm`.
- JANGAN tambah dependency baru.
- Template root WAJIB `<CvPage>`; wrapper entri WAJIB `data-entry` (konvensi template masa depan).
- Pengukuran preview: elemen di dalam container multi-kolom horizontal dianggap atomik; artikel multi-kolom (sidebar modern/creative) dianggap atomik penuh → break di kelipatan 1123px.
- Biome: `bun lint` harus lolos di setiap task.

---

### Task 1: Algoritma pagination murni + self-check

**Files:**
- Create: `features/cv/lib/page-breaks.ts`
- Create: `scripts/page-breaks-check.ts`

**Interfaces:**
- Produces: `A4_PAGE_HEIGHT_PX` (`number` = 1123), `interface PageBlock { top: number; height: number }`, `computePageBreaks(blocks: PageBlock[], pageHeight?: number): number[]` — mengembalikan array posisi y (relatif ke top artikel) tiap halaman baru. Dikonsumsi oleh Task 4.

- [ ] **Step 1: Tulis fungsi pagination**

Create `features/cv/lib/page-breaks.ts`:

```ts
export const A4_PAGE_HEIGHT_PX = 1123;

export interface PageBlock {
  /** Jarak dari top artikel ke top blok (px). */
  top: number;
  /** Tinggi blok (px). */
  height: number;
}

/**
 * Greedy pagination yang memirror aturan break PDF. `blocks` adalah unit
 * atomik (entri, lead section, container multi-kolom) dalam urutan dokumen,
 * diukur dari top artikel. Blok yang akan melewati batas halaman dipindah
 * utuh ke halaman berikutnya; blok yang lebih tinggi dari satu halaman
 * dipotong di kelipatan tinggi halaman. Mengembalikan posisi y tiap page
 * break. Blok kosong / urutan tidak monoton diabaikan.
 */
export function computePageBreaks(
  blocks: PageBlock[],
  pageHeight = A4_PAGE_HEIGHT_PX,
): number[] {
  const breaks: number[] = [];
  let pageStart = 0;
  for (const b of blocks) {
    const bottom = b.top + b.height;
    if (bottom <= pageStart + pageHeight) continue;
    if (b.height > pageHeight) {
      const next = pageStart + pageHeight;
      breaks.push(next);
      pageStart = next;
      continue;
    }
    const next = Math.max(b.top, pageStart);
    if (next <= pageStart) continue;
    breaks.push(next);
    pageStart = next;
  }
  return breaks;
}
```

- [ ] **Step 2: Tulis self-check**

Create `scripts/page-breaks-check.ts`:

```ts
import assert from "node:assert/strict";
import { computePageBreaks } from "../features/cv/lib/page-breaks";

// Konten pendek: tidak ada break.
assert.deepEqual(computePageBreaks([{ top: 0, height: 1000 }]), []);

// Pas satu halaman penuh: tidak ada break.
assert.deepEqual(computePageBreaks([{ top: 0, height: 1123 }]), []);

// Blok kedua nyangkut di tepi halaman -> dipindah utuh ke halaman berikut.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 1100 },
    { top: 1100, height: 100 },
  ]),
  [1100],
);

// Blok mengisi dua halaman persis.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 1123 },
    { top: 1123, height: 1123 },
  ]),
  [1123],
);

// Blok lebih tinggi dari satu halaman -> potong di kelipatan 1123.
assert.deepEqual(computePageBreaks([{ top: 0, height: 2400 }]), [1123, 2246]);

// Section dipindah utuh ke halaman 2, section berikut mengisi sisa halaman 2.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 1050 },
    { top: 1050, height: 200 },
    { top: 1250, height: 900 },
  ]),
  [1050],
);

console.log("page-breaks: ok");
```

- [ ] **Step 3: Jalankan self-check sampai lolos**

Run: `bun scripts/page-breaks-check.ts`
Expected: output `page-breaks: ok`, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add features/cv/lib/page-breaks.ts scripts/page-breaks-check.ts
git commit -m "feat: pure A4 pagination algorithm with self-check"
```

---

### Task 2: PDF export multi-halaman A4

**Files:**
- Modify: `features/cv/lib/pdf.ts:73-97`

**Interfaces:**
- Consumes: — (tidak ada perubahan API; `renderCvDocument` signature tetap).
- Produces: PDF multi-halaman A4 dari route print.

- [ ] **Step 1: Ganti export PDF jadi A4 multi-halaman**

Di `features/cv/lib/pdf.ts`, blok branch PDF (mulai dari komentar `// Single continuous page:` sampai `return new Uint8Array(buf);`) ganti jadi:

```ts
    // Real A4, paginated by Chromium's print engine: konten yang melebihi satu
    // lembar otomatis mengalir ke halaman 2, 3, ... Aturan break (entri utuh,
    // heading menempel ke section) ada di globals.css scoped ke
    // [data-print-root]. Template mengatur padding-nya sendiri, jadi margin
    // halaman 0 (sidebar full-bleed menyentuh tepi kertas).
    const buf = await page.pdf({
      width: "210mm",
      height: "297mm",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return new Uint8Array(buf);
```

Pastikan branch PNG tetap seperti semula (termasuk `await page.setViewport({ width: 794, height: 1123 });` sebelum screenshot).

- [ ] **Step 2: Verifikasi lint**

Run: `bun lint`
Expected: tidak ada error.

- [ ] **Step 3: Verifikasi manual (butuh browser lokal + login)**

1. `bun dev`, login, buat CV panjang (≥ 4-5 pengalaman/edukasi).
2. Panel Unduh → Unduh PDF.
3. Buka PDF: jumlah halaman mengikuti panjang konten (2, 3, ...), tidak ada entri terpotong di tengah, heading menempel ke section.
4. Untuk template sidebar (modern, creative): warna accent sidebar harus lanjut ke halaman 2.
   - Jika warna TIDAK lanjut di halaman 2 → fragmentasi grid bermasalah. Catat sebagai blocker Task 3 (band-gradient di Task 3 harus menutupinya; jika masih tidak, evaluasi ulang struktur sidebar).
5. `Ctrl+P` di halaman print route (`/builder/<cvId>/print`) juga harus menampilkan preview A4 multi-halaman.

- [ ] **Step 4: Commit**

```bash
git add features/cv/lib/pdf.ts
git commit -m "fix: export multi-page A4 PDF instead of single long page"
```

---

### Task 3: Wrapper `CvPage` bersama + adopsi semua template + `data-entry` + sidebar band

**Files:**
- Modify: `features/cv/components/templates/shared.tsx`
- Modify (adopsi CvPage): `classic.tsx`, `modern.tsx`, `creative.tsx`, `professional.tsx`, `minimal.tsx`, `fresh-graduate.tsx`, `executive.tsx`, `elegant.tsx`, `compact.tsx`
- Modify (tambah `data-entry`): `compact.tsx`, `creative.tsx`, `executive.tsx`, `elegant.tsx`, `minimal.tsx`

**Interfaces:**
- Consumes: — (TemplateProps tetap).
- Produces: `CvPage` component di `shared.tsx` (`{ className?: string; style?: CSSProperties; children: ReactNode }`, merender `<article>`). Semua template root memakainya → Task 4 bergantung pada root template berupa `<article>`.

- [ ] **Step 1: Tambah `CvPage` di `shared.tsx`**

Di `features/cv/components/templates/shared.tsx`, tambah import tipe React dan komponen `CvPage`:

```tsx
import type { CSSProperties, ReactNode } from "react";
import type { CvContent } from "@/features/cv/schemas/cv";

export interface TemplateProps {
  cv: CvContent;
}

/**
 * Kelas A4 standar yang dipakai SEMUA template. Ukuran halaman (794x1123px,
 * = 210x297mm @96dpi), bg, dan setting print konsisten agar preview dan PDF
 * tidak pernah melenceng antar template.
 */
const CV_PAGE_CLASS =
  "mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]";

/**
 * A4 page wrapper. KONVENSI template baru: root template WAJIB
 * <CvPage className="...">, dan setiap wrapper item (pengalaman/proyek/sertif/
 * organisasi/custom) WAJIB diberi `data-entry`. Dengan begitu pagination PDF,
 * aturan break, dan garis batas halaman di preview otomatis bekerja.
 */
export function CvPage({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <article
      className={className ? `${CV_PAGE_CLASS} ${className}` : CV_PAGE_CLASS}
      style={style}
    >
      {children}
    </article>
  );
}
```

- [ ] **Step 2: Adopsi `CvPage` di tiap template**

Untuk setiap file template, ganti tag `<article className="mx-auto min-h-[1123px] ...">` dengan `<CvPage ...>` (tutup `</article>` → `</CvPage>`) dan tambah `CvPage` ke import dari `./shared`. Mapping class tiap template:

| Template | Ganti `<article ...>` dengan | Keterangan |
|----------|------------------------------|------------|
| `classic.tsx` | `<CvPage className="p-10">` | |
| `professional.tsx` | `<CvPage>` | |
| `minimal.tsx` | `<CvPage className="p-12 font-light">` | |
| `fresh-graduate.tsx` | `<CvPage className="p-10">` | |
| `executive.tsx` | `<CvPage>` | |
| `elegant.tsx` | `<CvPage>` | |
| `compact.tsx` | `<CvPage>` | |
| `modern.tsx` | `<CvPage className="grid grid-cols-1 sm:grid-cols-[34%_1fr] sm:grid-rows-[1fr] print:grid-cols-[34%_1fr] print:grid-rows-[1fr]" style={{ background: "linear-gradient(to right, var(--cv-color-accent) 34%, var(--cv-color-bg) 34%)" }}>` | lihat Step 3 (sidebar band) |
| `creative.tsx` | `<CvPage className="grid grid-cols-1 sm:grid-cols-[40%_1fr] sm:grid-rows-[1fr] print:grid-cols-[40%_1fr] print:grid-rows-[1fr]" style={{ background: "linear-gradient(to right, var(--cv-color-accent) 40%, var(--cv-color-bg) 40%)" }}>` | lihat Step 3 (sidebar band) |

- [ ] **Step 3: Sidebar lanjut ke halaman berikut (modern & creative)**

Di `modern.tsx`, `<aside className="bg-[var(--cv-color-accent)] p-6 text-[var(--cv-color-on-accent)] print:[print-color-adjust:exact]">` diganti jadi:

```tsx
<aside className="p-6 text-[var(--cv-color-on-accent)]">
```

Di `creative.tsx`, `<aside className="bg-[var(--cv-color-accent)] p-7 text-[var(--cv-color-on-accent)] print:[print-color-adjust:exact]">` diganti jadi:

```tsx
<aside className="p-7 text-[var(--cv-color-on-accent)]">
```

Bg accent sekarang dari band-gradient pada `CvPage` (Step 2) — background container terpaginasi per fragmen, jadi warna sidebar pasti lanjut ke halaman 2+. Elemen lain di aside (foto, kontak, skill) tidak berubah.

- [ ] **Step 4: Tambah `data-entry` di template yang belum punya**

Aturan: pada setiap `.map((x, i) => (` di bagian experience, education, projects, organizations, custom, tambah `data-entry` ke elemen wrapper paling luar yang di-return. Untuk certifications yang merender `<p key={i}>` langsung, tambah `data-entry` ke `<p>` tersebut.

File yang perlu ditambah:
- `compact.tsx`: experience, education, projects, custom (organizations ada di sidebar tanpa data-entry — biarkan).
- `creative.tsx`: experience, projects, education, organizations, custom.
- `executive.tsx`: experience, education, certifications, projects, organizations, custom.
- `elegant.tsx`: experience, education, certifications, projects, organizations, custom.
- `minimal.tsx`: experience, education, projects, organizations, custom + `<p key={i}>` certifications.

Classic, modern, professional, fresh-graduate sudah punya `data-entry` — jangan diubah.

- [ ] **Step 5: Verifikasi**

1. `bun lint` — harus lolos.
2. Grep pastikan tidak ada lagi `min-h-[1123px]` di folder `features/cv/components/templates/` (selain `shared.tsx`):
   Run: `rg "min-h-\[1123px\]" features/cv/components/templates/`
   Expected: hanya `shared.tsx` yang match.
3. `bun build` — harus sukses.
4. Buka builder, ganti-ganti 9 template: tampilan preview tidak berubah signifikan dari sebelumnya (hanya penggantian wrapper, bukan desain).

- [ ] **Step 6: Commit**

```bash
git add features/cv/components/templates/
git commit -m "refactor: shared CvPage A4 wrapper across templates, sidebar band continuation"
```

---

### Task 4: Garis batas halaman di preview editor

**Files:**
- Create: `features/cv/hooks/use-cv-page-breaks.ts`
- Modify: `features/cv/components/cv-preview.tsx`

**Interfaces:**
- Consumes: `A4_PAGE_HEIGHT_PX`, `computePageBreaks`, `PageBlock` dari Task 1; root template `<article>` dari Task 3.
- Produces: `useCvPageBreaks(articleRef: RefObject<HTMLElement | null>): number[]` — posisi break (px, relatif top artikel, skala non-zoom) yang di-render sebagai garis.

- [ ] **Step 1: Tulis hook pengukuran + render break**

Create `features/cv/hooks/use-cv-page-breaks.ts`:

```ts
"use client";

import { type RefObject, useLayoutEffect, useState } from "react";
import {
  A4_PAGE_HEIGHT_PX,
  computePageBreaks,
  type PageBlock,
} from "@/features/cv/lib/page-breaks";

const PAGE_WIDTH_PX = 794;

/** Container multi-kolom horizontal (2 kolom sejajar) = unit atomik. */
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
    (a, b) =>
      a.getBoundingClientRect().top - b.getBoundingClientRect().top,
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

/** Walk DOM artikel single-column; container multi-kolom = satu blok atomik. */
function collectBlocks(
  el: HTMLElement,
  top: number,
  blocks: PageBlock[],
): void {
  for (const child of [...el.children].filter(
    (c): c is HTMLElement => c instanceof HTMLElement,
  )) {
    if (isHorizontalMultiCol(child)) {
      const r = child.getBoundingClientRect();
      blocks.push({ top: r.top - top, height: r.height });
      continue;
    }
    if (child.tagName === "SECTION") {
      blocks.push(...sectionBlocks(child, top));
      continue;
    }
    collectBlocks(child, top, blocks);
  }
}

function measureBreaks(root: HTMLElement): number[] {
  const article = root.querySelector("article") ?? root;
  const aRect = article.getBoundingClientRect();
  const scale = aRect.width / PAGE_WIDTH_PX || 1;
  const blocks: PageBlock[] = [];
  if (isHorizontalMultiCol(article)) {
    blocks.push({ top: 0, height: aRect.height / scale });
  } else {
    collectBlocks(article, aRect.top, blocks);
  }
  for (const b of blocks) {
    b.top /= scale;
    b.height /= scale;
  }
  return computePageBreaks(blocks, A4_PAGE_HEIGHT_PX);
}

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
    const measure = () => setBreaks(measureBreaks(article));
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

- [ ] **Step 2: Pasang di `cv-preview.tsx`**

Di `features/cv/components/cv-preview.tsx`:

1. Import hook:
```tsx
import { useCvPageBreaks } from "@/features/cv/hooks/use-cv-page-breaks";
```
2. Tambah ref untuk wrapper artikel:
```tsx
const previewRef = useRef<HTMLDivElement>(null);
const pageBreaks = useCvPageBreaks(previewRef);
```
3. Pada div pembungkus template, tambah `ref` + `relative`:
```tsx
<div
  ref={previewRef}
  className="relative w-[794px]"
  style={cvRootStyle({ typography, colors: effectiveColors })}
>
  <Template cv={content} />
</div>
```
4. Render garis + label halaman setelah `<Template />`, di dalam div yang sama:
```tsx
{pageBreaks.map((y, i) => (
  <div
    key={i}
    className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-2"
    style={{ top: y }}
  >
    <span className="h-px flex-1 border-t-2 border-dashed border-foreground/30" />
    <span className="rounded-full bg-foreground/70 px-2 py-0.5 text-[10px] font-semibold text-background">
      Hal {i + 2}
    </span>
    <span className="h-px flex-1 border-t-2 border-dashed border-foreground/30" />
  </div>
))}
```

Catatan: garis berada di dalam subtree `zoom` yang sama dengan artikel, dan `useCvPageBreaks` mengembalikan koordinat non-zoom — konsisten karena CSS px di dalam subtree zoom ikut ter-scale.

- [ ] **Step 3: Verifikasi**

1. `bun lint` — harus lolos.
2. `bun dev`, buka builder dengan CV panjang (single-column template seperti classic): garis putus-putus + label "Hal 2" muncul tepat di batas halaman; entri tidak terpotong garis.
3. Template multi-kolom (modern, creative, compact, fresh-graduate): garis di kelipatan halaman.
4. CV pendek: tidak ada garis.
5. Zoom in/out preview: garis tetap sejajar konten.

- [ ] **Step 4: Commit**

```bash
git add features/cv/hooks/use-cv-page-breaks.ts features/cv/components/cv-preview.tsx
git commit -m "feat: page-break overlay lines in CV preview"
```

---

### Task 5: Verifikasi akhir

**Files:**
- (tidak ada perubahan kode)

- [ ] **Step 1: Jalankan seluruh verifikasi**

```bash
bun lint
bun build
bun scripts/page-breaks-check.ts
```

Expected: semua lolos.

- [ ] **Step 2: Smoke test export end-to-end**

1. `bun dev`, login.
2. Untuk 9 template: CV pendek (1 halaman) dan CV panjang (2+ halaman).
3. Export PDF masing-masing: ukuran halaman A4, jumlah halaman benar, tidak ada entri terpotong, heading menempel, sidebar modern/creative lanjut ke halaman 2 dengan warna.
4. Preview: garis batas halaman tampil sesuai jumlah halaman.

- [ ] **Step 3: Rekap hasil**

Catat di commit message (atau laporan) konfirmasi: semua template lolos, dan limitation yang diketahui (posisi garis untuk artikel multi-kolom = kelipatan halaman; entri tunggal > 1 halaman bisa sedikit melenceng dari break PDF).

---

## Self-Review

**Spec coverage:**
- PDF multi-halaman A4 → Task 2.
- Preview garis batas presisi → Task 4 (pengukuran generik berbasis `data-entry`).
- Konsistensi template: `CvPage` wrapper → Task 3 Step 1-2; `data-entry` → Task 3 Step 4; sidebar band → Task 3 Step 3.
- Konvensi template masa depan → komentar di `CvPage` (`shared.tsx`), Task 3 Step 1.
- Verifikasi → Task 2 Step 3, Task 3 Step 5, Task 5.

**Placeholder scan:** tidak ada TBD/TODO; semua langkah punya kode/kriteria eksplisit.

**Type consistency:** `computePageBreaks(blocks: PageBlock[], pageHeight?)` konsisten di Task 1 (definisi) dan Task 4 (pemakaian). `useCvPageBreaks` di Task 4 mengembalikan `number[]`; `CvPage` props `{ className?, style?, children }` dipakai sesuai di Task 3.
