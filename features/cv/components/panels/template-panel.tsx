"use client";

import { CheckIcon, Crown } from "lucide-react";
import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PremiumTemplateUpsellDialog } from "@/features/billing/components/premium-template-upsell-dialog";
import { useSubscription } from "@/features/billing/hooks/use-billing";
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
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { cn } from "@/lib/utils";

type Filter = TemplateCategory | "all";

/**
 * Non-interactive preview of a template rendered with sample data. Reuses
 * `CvThumbnail`, which fits the 794px-wide render into the card via a
 * ResizeObserver, so it stays crisp and never overflows as the resizable
 * editor panel is widened or narrowed.
 *
 * Memoized on the template id: sample data never changes, so a thumbnail only
 * needs to render once even as the panel re-renders on selection changes.
 */
const TemplateThumb = memo(function TemplateThumb({
  template,
}: {
  template: TemplateMeta;
}) {
  // Render the thumbnail with the template's own default palette so the picker
  // shows each template's intended colors (not one shared neutral look).
  const sample = {
    ...SAMPLE_CV,
    templateId: template.id,
    colors: templateDefaultColors(template.id),
    typography: templateDefaultTypography(template.id),
  };
  return <CvThumbnail cv={sample} className="w-full" aspectRatio="1 / 1.414" />;
});

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: card needs rich content (thumbnail + text), not an <input radio>
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary ring-2 ring-primary"
          : "hover:border-primary/50",
      )}
    >
      <div className="border-b">
        <TemplateThumb template={template} />
      </div>
      {template.premium ? (
        <Badge className="absolute left-2 top-2 h-4 px-1.5 text-[0.5625rem] [&>svg]:!size-2 border-amber-200/60 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.55)]">
          <Crown
            aria-hidden="true"
            className="fill-white text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
          />
          Premium
        </Badge>
      ) : null}
      {selected ? (
        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <CheckIcon className="size-3.5" />
        </span>
      ) : null}
      <div className="p-2.5">
        <p className="text-sm font-semibold">{template.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {template.description}
        </p>
      </div>
    </button>
  );
}

export function TemplatePanel() {
  const templateId = useCvStore((s) => s.templateId);
  const setTemplateId = useCvStore((s) => s.setTemplateId);
  const analytics = useCVAnalytics();
  const [filter, setFilter] = useState<Filter>("all");
  const { data: subscription } = useSubscription();
  const canUsePremium = !!subscription;
  const [upsellTemplate, setUpsellTemplate] = useState<TemplateMeta | null>(
    null,
  );

  const visible =
    filter === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.categories.includes(filter));

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Semua" },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.label })),
  ];

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Template</h2>
        <p className="text-xs text-muted-foreground">
          Pilih template sesuai preferensi Anda.
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2 border-b p-4"
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

      <div
        role="radiogroup"
        aria-label="Pilihan template"
        className="grid grid-cols-2 gap-3 p-4"
      >
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={template.id === templateId}
            onSelect={() => {
              analytics.track("template_changed", {
                template_id: template.id,
                template_name: template.name,
              });
              if (template.premium && !canUsePremium) {
                setUpsellTemplate(template);
                return;
              }
              setTemplateId(template.id);
            }}
          />
        ))}
        {visible.length === 0 ? (
          <p className="col-span-2 py-6 text-center text-sm text-muted-foreground">
            Tidak ada template pada kategori ini.
          </p>
        ) : null}
      </div>

      <PremiumTemplateUpsellDialog
        open={!!upsellTemplate}
        onOpenChange={(open) => {
          if (!open) setUpsellTemplate(null);
        }}
        templateName={upsellTemplate?.name}
      />
    </div>
  );
}
