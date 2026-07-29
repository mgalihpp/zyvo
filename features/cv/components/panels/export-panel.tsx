"use client";

import { FileDownIcon, FileImageIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

type Format = "pdf" | "png";

export function ExportPanel() {
  const cvId = useCvStore((s) => s.cvId);
  const [busy, setBusy] = useState<Format | null>(null);

  async function download(format: Format) {
    setBusy(format);
    try {
      const res = await fetch(`/api/cv/${cvId}/export?format=${format}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") ?? "";
      const name = dispo.match(/filename="([^"]+)"/)?.[1] ?? `cv.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // base-ui toast manager: `toast.add({ title, description })`.
      toast.add({
        title: "Gagal mengunduh CV",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Unduh</h2>
        <p className="text-xs text-muted-foreground">
          Unduh mengambil versi tersimpan terakhir. Perubahan tersimpan otomatis
          beberapa saat setelah Anda mengetik.
        </p>
      </div>
      <div className="grid gap-3 p-4">
        <button
          type="button"
          onClick={() => download("pdf")}
          disabled={busy !== null}
          className="group flex items-start gap-3 rounded-lg border bg-background p-4 text-left shadow-sm transition-shadow hover:shadow-md hover:ring-2 hover:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
        >
          {busy === "pdf" ? (
            <div className="flex w-full items-center justify-center gap-2">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              <p className="text-sm font-semibold">Menyiapkan…</p>
            </div>
          ) : (
            <>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 shadow-inner dark:bg-red-950 dark:text-red-400">
                <FileDownIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Unduh PDF</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Format dokumen, cocok untuk dicetak
                </p>
              </div>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => download("png")}
          disabled={busy !== null}
          className="group flex items-start gap-3 rounded-lg border bg-background p-4 text-left shadow-sm transition-shadow hover:shadow-md hover:ring-2 hover:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
        >
          {busy === "png" ? (
            <div className="flex w-full items-center justify-center gap-2">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              <p className="text-sm font-semibold">Menyiapkan…</p>
            </div>
          ) : (
            <>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 shadow-inner dark:bg-violet-950 dark:text-violet-400">
                <FileImageIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Unduh PNG</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Format gambar, cocok untuk dibagikan secara online
                </p>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
