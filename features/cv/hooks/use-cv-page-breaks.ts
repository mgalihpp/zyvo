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
      setBreaks(
        computePageBreaks(collectArticleBlocks(article), A4_PAGE_HEIGHT_PX),
      );
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
