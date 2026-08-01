"use client";

import { FileUp, PenLine } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";

export type OnboardingMethod = "manual" | "import" | "ai";

export function StepChooseMethod({
  onSelect,
}: {
  onSelect: (method: OnboardingMethod) => void;
}) {
  const options = [
    {
      method: "manual" as const,
      icon: PenLine,
      title: "Buat Manual",
      description:
        "Mulai dari CV kosong dan isi setiap bagian sendiri di builder.",
    },
    {
      method: "import" as const,
      icon: FileUp,
      title: "Import CV",
      description:
        "Upload CV lama kamu dengan format (PDF/DOCX) atau paste teksnya.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.method}
            type="button"
            onClick={() => onSelect(opt.method)}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <opt.icon className="size-5" />
            </span>
            <span className="text-lg font-semibold">{opt.title}</span>
            <span className="text-sm text-muted-foreground">
              {opt.description}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSelect("ai")}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <Highlighter action="underline" color="#7c3aed" strokeWidth={2}>
          Atau buat dengan AI
        </Highlighter>
      </button>
    </div>
  );
}
