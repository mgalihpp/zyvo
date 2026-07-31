"use client";

import { DownloadIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc/client";

export function BoardToolbar({ onAdd }: { onAdd: () => void }) {
  const exportMutation = trpc.jobTracker.exportCsv.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lamaran-zyvo.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err) => toast.add({ title: err.message, type: "error" }),
  });

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onAdd}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        Tambah Lamaran
      </Button>
      <Button
        variant="outline"
        loading={exportMutation.isPending}
        loadingText="Mengekspor..."
        onClick={() => exportMutation.mutate()}
      >
        <DownloadIcon data-icon="inline-start" aria-hidden="true" />
        Export CSV
      </Button>
    </div>
  );
}
