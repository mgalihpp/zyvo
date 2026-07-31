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
