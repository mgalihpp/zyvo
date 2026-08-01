"use client";

import { Crown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type TemplateCategory,
} from "@/features/cv/components/templates";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cn } from "@/lib/utils";

type Filter = TemplateCategory | "all";

export function StepChooseTemplate({
  onSelect,
}: {
  onSelect: (templateId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.categories.includes(filter));

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Semua" },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.label })),
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap justify-center gap-2"
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((template) => {
          const cv = {
            ...SAMPLE_CV,
            templateId: template.id,
            colors: templateDefaultColors(template.id),
            typography: templateDefaultTypography(template.id),
          };
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className="group flex flex-col text-left focus-visible:outline-none"
            >
              <div className="relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-primary/40">
                <CvThumbnail
                  cv={cv}
                  className="w-full"
                  aspectRatio="1 / 1.414"
                />
                {template.premium ? (
                  <Badge className="absolute left-2 top-2 border-amber-200/60 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.55)]">
                    <Crown
                      aria-hidden="true"
                      className="fill-white text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                    />
                    Premium
                  </Badge>
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/60 group-hover:opacity-100">
                  <span className="text-base font-bold text-white">
                    Pilih template
                  </span>
                </div>
              </div>
              <p className="mt-2 line-clamp-1 px-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                {template.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
