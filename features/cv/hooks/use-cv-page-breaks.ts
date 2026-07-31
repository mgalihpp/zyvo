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
    collectBlocks(article as HTMLElement, aRect.top, blocks);
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
