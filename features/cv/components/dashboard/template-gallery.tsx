"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CheckIcon, Crown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { PremiumTemplateUpsellDialog } from "@/features/billing/components/premium-template-upsell-dialog";
import { useSubscription } from "@/features/billing/hooks/use-billing";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type TemplateCategory,
  type TemplateMeta,
} from "@/features/cv/components/templates";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Filter = TemplateCategory | "all";

const TEMPLATE_FEATURES = [
  "Ukuran A4 / US-Letter",
  "Teks dapat diedit",
  "Dapat disesuaikan sepenuhnya",
  "Siap cetak",
];

function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onUse,
  busy,
}: {
  template: TemplateMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
  busy: boolean;
}) {
  const cv = {
    ...SAMPLE_CV,
    templateId: template.id,
    colors: templateDefaultColors(template.id),
    typography: templateDefaultTypography(template.id),
  };

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
          {/* Left: A4 preview */}
          <div className="flex w-[45%] shrink-0 items-center justify-center bg-muted p-6">
            <div className="w-full">
              <CvThumbnail
                cv={cv}
                className="w-full shadow-lg"
                aspectRatio="1 / 1.414"
              />
            </div>
          </div>

          {/* Right: info — typography/colors mirror the template */}
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

            <Button
              className="w-fit rounded-full bg-violet-600 px-6 text-white hover:bg-violet-700"
              onClick={onUse}
              loading={busy}
            >
              Gunakan template ini
            </Button>
          </div>

          {/* Close */}
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
  const cv = {
    ...SAMPLE_CV,
    templateId: template.id,
    colors: templateDefaultColors(template.id),
    typography: templateDefaultTypography(template.id),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col text-left focus-visible:outline-none"
    >
      {/* Portrait A4 thumbnail */}
      <div className="group/thumb relative cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-primary/30">
        <CvThumbnail cv={cv} className="w-full" aspectRatio="1 / 1.414" />
        {template.premium ? (
          <Badge className="absolute left-2 top-2 h-4 px-1.5 text-[0.5625rem] [&>svg]:!size-2 border-amber-200/60 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.55)]">
            <Crown
              aria-hidden="true"
              className="fill-white text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
            />
            Premium
          </Badge>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 p-6 text-center opacity-0 transition-all duration-200 group-hover/thumb:bg-black/60 group-hover/thumb:opacity-100">
          <span className="text-lg font-bold text-white">
            PRATINJAU &nbsp;&rarr;
          </span>
        </div>
      </div>

      {/* Label below */}
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

export function TemplateGallery({
  showFilters = true,
  limit,
}: {
  showFilters?: boolean;
  limit?: number;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<Filter>("all");
  const [preview, setPreview] = useState<TemplateMeta | null>(null);
  const { data: subscription } = useSubscription();
  const canUsePremium = !!subscription;
  const [upsellTemplate, setUpsellTemplate] = useState<TemplateMeta | null>(
    null,
  );
  const upsell = usePlanUpsell();

  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
    onError: (err) => {
      if (!upsell.handleError(err))
        toast.add({ title: err.message, type: "error" });
    },
  });

  const filtered =
    filter === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.categories.includes(filter));
  const visible = limit ? filtered.slice(0, limit) : filtered;

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Semua" },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.label })),
  ];

  return (
    <div className="space-y-4">
      {showFilters ? (
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Filter kategori template"
        >
          {chips.map((chip) => {
            const active = chip.id === filter;
            return (
              // biome-ignore lint/a11y/useSemanticElements: pill toggle, not a native radio input
              <button
                key={chip.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(chip.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => setPreview(template)}
          />
        ))}
      </div>

      {preview && (
        <TemplatePreviewDialog
          template={preview}
          open={!!preview}
          onOpenChange={(open) => {
            if (!open) setPreview(null);
          }}
          onUse={() => {
            if (preview.premium && !canUsePremium) {
              setUpsellTemplate(preview);
              return;
            }
            createMutation.mutate({ templateId: preview.id });
          }}
          busy={
            createMutation.isPending &&
            createMutation.variables?.templateId === preview.id
          }
        />
      )}

      <PremiumTemplateUpsellDialog
        open={!!upsellTemplate}
        onOpenChange={(open) => {
          if (!open) setUpsellTemplate(null);
        }}
        templateName={upsellTemplate?.name}
      />
      {upsell.dialog}
    </div>
  );
}
