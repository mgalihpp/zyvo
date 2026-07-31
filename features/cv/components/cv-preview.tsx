"use client";

import { Minus, Plus } from "lucide-react";
import { type PointerEvent, Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCvPageBreaks } from "@/features/cv/hooks/use-cv-page-breaks";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import type { CvContent } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { getTemplate } from "./templates";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const clampZoom = (z: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));

function PreviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Skeleton className="aspect-[1/1.414] w-full" />
    </div>
  );
}

export function CvPreview() {
  // Select each field individually so the store returns stable references and
  // avoids the "getServerSnapshot should be cached" infinite loop.
  const title = useCvStore((s) => s.title);
  const templateId = useCvStore((s) => s.templateId);
  const typography = useCvStore((s) => s.typography);
  const colors = useCvStore((s) => s.colors);
  const draftColors = useCvStore((s) => s.draftColors);
  const activePanel = useCvStore((s) => s.activePanel);
  const personal = useCvStore((s) => s.personal);
  const summary = useCvStore((s) => s.summary);
  const experience = useCvStore((s) => s.experience);
  const education = useCvStore((s) => s.education);
  const skills = useCvStore((s) => s.skills);
  const interpersonal = useCvStore((s) => s.interpersonal);
  const languages = useCvStore((s) => s.languages);
  const certifications = useCvStore((s) => s.certifications);
  const organizations = useCvStore((s) => s.organizations);
  const projects = useCvStore((s) => s.projects);
  const custom = useCvStore((s) => s.custom);

  // Live-preview uncommitted color edits while the colors panel is open.
  const effectiveColors =
    activePanel === "colors" && draftColors ? draftColors : colors;

  const content: CvContent = {
    title,
    templateId,
    typography,
    colors: effectiveColors,
    personal,
    summary,
    experience,
    education,
    skills,
    interpersonal,
    languages,
    certifications,
    organizations,
    projects,
    custom,
  };

  const Template = getTemplate(templateId).lazyComponent;

  const [zoom, setZoom] = useState(1);

  const previewRef = useRef<HTMLDivElement>(null);
  const pageBreaks = useCvPageBreaks(previewRef);

  // Grab-to-pan: drag anywhere on the preview to scroll. Skip when the pointer
  // starts on a form control/link so text selection & inputs still work.
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number }>(
    null,
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    if ((e.target as HTMLElement).closest("input,textarea,button,a,select"))
      return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !drag.current) return;
    el.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    el.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    scrollRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="relative h-full bg-neutral-100 dark:bg-neutral-900">
      {/* Scroll lives on this inner box only, so zooming the CV scrolls the CV
       * — the zoom pill sits on the non-scrolling parent and stays put. */}
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="h-full cursor-grab overflow-auto p-6 active:cursor-grabbing"
      >
        <Suspense fallback={<PreviewSkeleton />}>
          {/* `zoom` (vs transform:scale) reflows the layout box, so the scroll
           * container gets real width/height and both axes scroll when zoomed
           * in. mx-auto keeps it centered when zoomed out. */}
          <div className="mx-auto w-fit" style={{ zoom }}>
            {/* Pin to the 794px (A4 @96dpi) print width so the preview is
             * WYSIWYG vs the PDF and never reflows narrower when the editor
             * panel opens. */}
            <div
              ref={previewRef}
              className="relative w-[794px]"
              style={cvRootStyle({ typography, colors: effectiveColors })}
            >
              <Template cv={content} />
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
            </div>
          </div>
        </Suspense>
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex w-fit flex-col items-center gap-1 rounded-full border bg-background/90 p-1 shadow-md backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-full"
          onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </Button>
        <button
          type="button"
          className="min-w-8 text-center text-[10px] tabular-nums text-muted-foreground hover:text-foreground"
          onClick={() => setZoom(1)}
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-full"
          onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
