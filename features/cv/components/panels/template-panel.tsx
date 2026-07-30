"use client";

import { CheckIcon } from "lucide-react";
import { memo, useState } from "react";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type TemplateCategory,
  type TemplateMeta,
} from "@/features/cv/components/templates";
import { getEagerTemplate } from "@/features/cv/components/templates/eager";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { cn } from "@/lib/utils";

type Filter = TemplateCategory | "all";

/**
 * Scaled, non-interactive preview of a template rendered with sample data.
 * The 794px-wide template is transform-scaled down to the thumbnail width so
 * the real renderer is reused (no separate thumbnail art to maintain).
 *
 * Memoized on the template id: sample data never changes, so a thumbnail only
 * needs to render once even as the panel re-renders on selection changes.
 */
const TemplateThumb = memo(function TemplateThumb({
  template,
}: {
  template: TemplateMeta;
}) {
  const Template = getEagerTemplate(template.id);
  // Render the thumbnail with the template's own default palette so the picker
  // shows each template's intended colors (not one shared neutral look).
  const sample = {
    ...SAMPLE_CV,
    colors: templateDefaultColors(template.id),
    typography: templateDefaultTypography(template.id),
  };
  // 794px design width scaled into a ~248px-wide card interior.
  const scale = 0.3;
  return (
    <div
      className="pointer-events-none relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: "1 / 1.414" }}
      aria-hidden
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: 794,
          transform: `scale(${scale})`,
          ...cvRootStyle(sample),
        }}
      >
        <Template cv={sample} />
      </div>
    </div>
  );
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
    </div>
  );
}
