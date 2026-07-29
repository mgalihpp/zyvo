"use client";

import { CheckIcon, CircleAlertIcon, LoaderIcon } from "lucide-react";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { cn } from "@/lib/utils";

export function SaveIndicator() {
  const status = useCvStore((s) => s.saveStatus);

  const map = {
    idle: { label: "Semua perubahan tersimpan", icon: null, tone: "muted" },
    dirty: { label: "Perubahan belum disimpan", icon: null, tone: "muted" },
    saving: { label: "Menyimpan…", icon: "spin", tone: "muted" },
    saved: { label: "Tersimpan", icon: "check", tone: "ok" },
    error: { label: "Gagal menyimpan", icon: "alert", tone: "error" },
  } as const;

  const { label, icon, tone } = map[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        tone === "muted" && "text-muted-foreground",
        tone === "ok" && "text-green-600 dark:text-green-500",
        tone === "error" && "text-destructive",
      )}
    >
      {icon === "spin" && <LoaderIcon className="size-3.5 animate-spin" />}
      {icon === "check" && <CheckIcon className="size-3.5" />}
      {icon === "alert" && <CircleAlertIcon className="size-3.5" />}
      {label}
    </span>
  );
}
