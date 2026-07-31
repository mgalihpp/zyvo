"use client";

import { AlertTriangleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeAlertProps {
  planName: string;
  onContinue: () => void;
  onDismiss: () => void;
}

export function ResumeAlert({
  planName,
  onContinue,
  onDismiss,
}: ResumeAlertProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <AlertTriangleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Pembayaran {planName} belum selesai
        </p>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
          Anda menutup jendela pembayaran. Transaksi masih dapat dilanjutkan.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={onContinue}>
          Lanjutkan Pembayaran
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label="Tutup"
          className="size-8 text-amber-700/70 hover:text-amber-900 dark:text-amber-300/70"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
