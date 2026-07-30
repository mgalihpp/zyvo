"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CheckIcon, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import {
  TEMPLATES,
  type TemplateMeta,
} from "@/features/cv/components/templates";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

const TEMPLATE_FEATURES = [
  "Ukuran A4 / US-Letter",
  "Teks dapat diedit",
  "Dapat disesuaikan sepenuhnya",
  "Siap cetak",
];

function sampleCvFor(template: TemplateMeta) {
  return {
    ...SAMPLE_CV,
    templateId: template.id,
    colors: templateDefaultColors(template.id),
    typography: templateDefaultTypography(template.id),
  };
}

/** Preview dialog mirroring the dashboard one; CTA links to signup. */
function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: {
  template: TemplateMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cv = sampleCvFor(template);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-xl bg-popover text-popover-foreground ring-1 ring-foreground/10",
            "duration-100 outline-none sm:max-w-4xl",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
        >
          <div className="flex w-[45%] shrink-0 items-center justify-center bg-muted p-6">
            <div className="w-full">
              <CvThumbnail
                cv={cv}
                className="w-full shadow-lg"
                aspectRatio="1 / 1.414"
              />
            </div>
          </div>

          <div
            className="flex flex-1 flex-col justify-center gap-6 p-8"
            style={cvRootStyle(cv)}
          >
            <div className="space-y-2">
              <p
                className="text-xs font-semibold uppercase tracking-widest opacity-60"
                style={{
                  color: "var(--cv-color-text)",
                  fontFamily: "var(--cv-font-body)",
                }}
              >
                {template.categories
                  .slice(0, 2)
                  .join(" · ")
                  .replace(/-/g, " ")
                  .toUpperCase()}
              </p>
              <h2
                className="text-2xl font-bold leading-tight"
                style={{
                  color: "var(--cv-color-heading)",
                  fontFamily: "var(--cv-font-heading)",
                }}
              >
                {template.name.toUpperCase()}
              </h2>
              <p
                className="text-sm opacity-70"
                style={{
                  color: "var(--cv-color-text)",
                  fontFamily: "var(--cv-font-body)",
                }}
              >
                {template.description}
              </p>
            </div>

            <ul className="space-y-2">
              {TEMPLATE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm"
                  style={{
                    color: "var(--cv-color-text)",
                    fontFamily: "var(--cv-font-body)",
                  }}
                >
                  <CheckIcon
                    className="size-4 shrink-0"
                    style={{ color: "var(--cv-color-accent)" }}
                  />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="w-fit rounded-full bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
            >
              Gunakan template ini
            </Link>
          </div>

          <DialogPrimitive.Close
            className={cn(
              "absolute top-4 right-4 rounded-full p-1 text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Tutup"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: TemplateMeta;
  onClick: () => void;
}) {
  const cv = sampleCvFor(template);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/thumb flex w-full flex-col text-left focus-visible:outline-none"
    >
      <div className="relative block cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm outline outline-2 outline-transparent transition-all duration-200 group-hover/thumb:shadow-md group-hover/thumb:outline-primary/30">
        <CvThumbnail cv={cv} className="w-full" aspectRatio="1 / 1.414" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 p-6 text-center opacity-0 transition-all duration-200 group-hover/thumb:bg-black/60 group-hover/thumb:opacity-100">
          <span className="text-lg font-bold text-white">
            PRATINJAU &nbsp;&rarr;
          </span>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-xs uppercase tracking-wide text-muted-foreground">
          {template.name}
          {" · "}
          <span className="font-normal text-muted-foreground">
            {template.description}
          </span>
        </p>
      </div>
    </button>
  );
}

export function TemplatesShowcase() {
  const [preview, setPreview] = useState<TemplateMeta | null>(null);

  return (
    <section id="template" className="mx-auto w-full max-w-6xl px-6 py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Template"
          title="Desain profesional untuk setiap karier"
          description="Setiap template dirancang oleh desainer dan diuji agar tetap terbaca oleh sistem ATS."
        />
      </Reveal>

      <Reveal className="mt-16">
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent className="-ml-4 py-2">
            {TEMPLATES.map((template) => (
              <CarouselItem
                key={template.id}
                className="pl-4 py-2 basis-1/2 sm:basis-1/3 lg:basis-1/4"
              >
                <TemplateCard
                  template={template}
                  onClick={() => setPreview(template)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </Reveal>

      <div className="mt-12 flex justify-center">
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }), "h-10 px-6 text-sm")}
        >
          Coba semua template gratis
        </Link>
      </div>

      {preview && (
        <TemplatePreviewDialog
          template={preview}
          open={!!preview}
          onOpenChange={(open) => {
            if (!open) setPreview(null);
          }}
        />
      )}
    </section>
  );
}
