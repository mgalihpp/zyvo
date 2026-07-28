"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Filter = TemplateCategory | "all";

function TemplateCard({
  template,
  onUse,
  busy,
}: {
  template: TemplateMeta;
  onUse: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <div className="border-b bg-muted">
        <CvThumbnail
          cv={{
            ...SAMPLE_CV,
            templateId: template.id,
            colors: templateDefaultColors(template.id),
            typography: templateDefaultTypography(template.id),
          }}
          className="w-full"
          aspectRatio="4 / 3"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="text-sm font-semibold">{template.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {template.description}
          </p>
        </div>
        <Button
          size="sm"
          className="mt-auto w-full border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={onUse}
          loading={busy}
        >
          Gunakan Template
        </Button>
      </div>
    </div>
  );
}

/** Template gallery. "Gunakan Template" creates a CV with that template and opens it. */
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

  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            busy={
              createMutation.isPending &&
              createMutation.variables?.templateId === template.id
            }
            onUse={() => createMutation.mutate({ templateId: template.id })}
          />
        ))}
      </div>
    </div>
  );
}
