"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { getEagerTemplate } from "@/features/cv/components/templates/eager";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import type { CvContent } from "@/features/cv/schemas/cv";
import { emptyPersonal } from "@/features/cv/schemas/cv";

/** A4 render width (px) the templates are designed against. */
const RENDER_WIDTH = 794;
/** A4 render height (px) at RENDER_WIDTH — keeps thumbnails a full page tall. */
const RENDER_HEIGHT = 1123;

/**
 * Scaled-down live render of a CV/template used as a card thumbnail. The inner
 * template renders at full A4 width and is scaled to fit the container width,
 * so the thumbnail stays crisp at any card size (no separate preview image).
 */
export const CvThumbnail = memo(function CvThumbnail({
  cv,
  className,
  aspectRatio = "1 / 1.414",
}: {
  cv: CvContent;
  className?: string;
  /** Container aspect ratio. Use a landscape value (e.g. "4 / 3") for card previews. */
  aspectRatio?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  // Guard against legacy MongoDB docs where `personal` was not yet stored.
  const safeCv: CvContent = cv.personal
    ? cv
    : { ...cv, personal: { ...emptyPersonal } };
  const Template = getEagerTemplate(safeCv.templateId);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / RENDER_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className ?? ""}`}
      style={{ aspectRatio }}
      aria-hidden
    >
      <div
        className="pointer-events-none origin-top-left overflow-hidden bg-white [&>article]:min-h-full"
        style={{
          width: RENDER_WIDTH,
          height: RENDER_HEIGHT,
          visibility: scale === null ? "hidden" : "visible",
          transform: `scale(${scale ?? 0.25})`,
          ...cvRootStyle(safeCv),
        }}
      >
        <Template cv={safeCv} />
      </div>
    </div>
  );
});
