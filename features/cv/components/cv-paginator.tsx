"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { TemplatePagination } from "@/features/cv/components/templates/registry";
import {
  collectArticleBlocks,
  measureArticleHeight,
} from "@/features/cv/lib/measure-blocks";
import {
  A4_PAGE_HEIGHT_PX,
  computePageBreaks,
} from "@/features/cv/lib/page-breaks";

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
  const continuationTop =
    pagination?.continuationTop ?? DEFAULT_CONTINUATION_TOP;
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
