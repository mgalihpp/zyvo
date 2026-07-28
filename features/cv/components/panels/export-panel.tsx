"use client";

import { FileTextIcon, ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-3 p-4">
        <Button
          type="button"
          className="w-full"
          onClick={() => download("pdf")}
          loading={busy === "pdf"}
          disabled={busy !== null}
        >
          <FileTextIcon data-icon="inline-start" />
          Unduh PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => download("png")}
          loading={busy === "png"}
          disabled={busy !== null}
        >
          <ImageIcon data-icon="inline-start" />
          Unduh PNG
        </Button>
      </div>
    </div>
  );
}
