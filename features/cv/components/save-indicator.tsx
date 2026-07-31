"use client";

import { AlertCircle, Check, Cloud, Loader2 } from "lucide-react";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { cn } from "@/lib/utils";

const CONFIG = {
  idle: { label: "Tersimpan", Icon: Cloud, tone: "ok" },
  dirty: { label: "Ada perubahan…", Icon: null, tone: "muted" },
  saving: { label: "Menyimpan…", Icon: Loader2, tone: "muted" },
  saved: { label: "Tersimpan", Icon: Check, tone: "ok" },
  error: { label: "Gagal menyimpan", Icon: AlertCircle, tone: "error" },
} as const;

export function SaveIndicator() {
  const status = useCvStore((s) => s.saveStatus);
  const { label, Icon, tone } = CONFIG[status];

  return (
    <span
      aria-hidden={status === "idle"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ease-out",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "ok" && "bg-green-500/10 text-green-600 dark:text-green-400",
        tone === "error" && "bg-destructive/10 text-destructive",
        status === "idle" && "pointer-events-none -translate-y-1 opacity-0",
      )}
    >
      {Icon && (
        <Icon className={cn("size-3", status === "saving" && "animate-spin")} />
      )}
      {label}
    </span>
  );
}
