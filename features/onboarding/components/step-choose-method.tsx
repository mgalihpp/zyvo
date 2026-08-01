"use client";

import { FileUp, PenLine, SparklesIcon } from "lucide-react";

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
        "Upload CV lama (PDF/DOCX) atau paste teksnya — AI akan mengisi semuanya otomatis.",
    },
    {
      method: "ai" as const,
      icon: SparklesIcon,
      title: "Buat dengan AI",
      description:
        "Ceritakan tentang dirimu — AI menyusun draf CV lengkap dari info itu.",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
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
  );
}
