"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { getEagerTemplate } from "@/features/cv/components/templates/eager";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import type { CvContent } from "@/features/cv/schemas/cv";

/** A4 render width (px) the templates are designed against. */
const RENDER_WIDTH = 794;

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
  const [scale, setScale] = useState(0.25);
  const Template = getEagerTemplate(cv.templateId);

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
      // Skip rendering the full A4 template for off-screen cards; the box keeps
      // its size via aspect-ratio so scrolling stays stable. Cuts mount cost on
      // long CV lists / template grids.
      style={{ aspectRatio, contentVisibility: "auto" }}
      aria-hidden
    >
      <div
        className="pointer-events-none origin-top-left overflow-hidden bg-white"
        style={{
          width: RENDER_WIDTH,
          transform: `scale(${scale})`,
          ...cvRootStyle(cv),
        }}
      >
        <Template cv={cv} />
      </div>
    </div>
  );
});
