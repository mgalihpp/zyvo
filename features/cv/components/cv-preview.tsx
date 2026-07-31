"use client";

import { EyeIcon, Minus, Plus } from "lucide-react";
import { type PointerEvent, Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import type { CvContent } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { CvPaginator } from "./cv-paginator";
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
  // A past version being previewed from the history panel, if any.
  const previewContent = useCvStore((s) => s.previewContent);
  const setPreviewContent = useCvStore((s) => s.setPreviewContent);

  // Live-preview uncommitted color edits while the colors panel is open.
  const effectiveColors =
    activePanel === "colors" && draftColors ? draftColors : colors;

  const liveContent: CvContent = {
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

  // Version preview wins over the live draft (read-only look-back).
  const content = previewContent ?? liveContent;

  const template = getTemplate(content.templateId);
  const Template = template.lazyComponent;

  const [zoom, setZoom] = useState(1);

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
      {previewContent ? (
        <div className="absolute inset-x-0 top-4 z-10 mx-auto flex w-fit items-center gap-3 rounded-full border border-amber-500/50 bg-background/95 py-1.5 pl-4 pr-1.5 text-xs shadow-md backdrop-blur">
          <span className="flex items-center gap-1.5 font-medium">
            <EyeIcon className="size-3.5 text-amber-600 dark:text-amber-500" />
            Pratinjau versi lama
          </span>
          <Button
            size="sm"
            className="h-6 rounded-full px-2.5 text-xs"
            onClick={() => setPreviewContent(null)}
          >
            Kembali ke versi sekarang
          </Button>
        </div>
      ) : null}
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
              className="w-[794px]"
              style={cvRootStyle({
                typography: content.typography,
                colors: content.colors,
              })}
            >
              <CvPaginator
                pagination={template.pagination}
                pageGapClass="gap-6"
              >
                <Template cv={content} />
              </CvPaginator>
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
