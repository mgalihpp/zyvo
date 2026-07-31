"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CvContent } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

/** "31 Jul 2026, 14.02" in the user's locale. */
function formatVersionDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HistoryPanel() {
  const cvId = useCvStore((s) => s.cvId);
  const replaceContent = useCvStore((s) => s.replaceContent);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const versions = trpc.cv.listVersions.useQuery(
    { cvId: cvId ?? "" },
    { enabled: !!cvId },
  );

  const restoreMutation = trpc.cv.restoreVersion.useMutation({
    onSuccess: (cv) => {
      // The server returns the full restored CV row; strip identity fields
      // down to CvContent and hydrate the store with it.
      const {
        id: _id,
        userId: _u,
        createdAt: _c,
        updatedAt: _up,
        ...rest
      } = cv;
      replaceContent(rest as CvContent);
      setConfirmId(null);
      utils.cv.listVersions.invalidate({ cvId: cv.id });
    },
    onError: () => {
      setConfirmId(null);
      versions.refetch();
    },
  });

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Riwayat</h2>
        <p className="text-xs text-muted-foreground">
          Kembalikan CV ke versi sebelumnya. Versi tersimpan otomatis saat Anda
          mengedit.
        </p>
      </div>

      <div className="p-4">
        {versions.isLoading ? (
          <div className="space-y-3">
            {["a", "b", "c"].map((id) => (
              <Skeleton key={id} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Gagal memuat riwayat. Coba lagi nanti.
          </p>
        ) : versions.data && versions.data.length > 0 ? (
          <ul className="space-y-3">
            {versions.data.map((v, i) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatVersionDate(new Date(v.createdAt))}
                  </p>
                  {i === 0 ? (
                    <p className="text-xs text-muted-foreground">Terbaru</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmId(v.id)}
                >
                  Pulihkan
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada versi tersimpan. Versi dibuat otomatis saat Anda mengedit
            CV.
          </p>
        )}
      </div>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan versi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Konten CV saat ini akan disimpan sebagai versi baru terlebih
              dahulu, lalu diganti dengan versi yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <Button
              loading={restoreMutation.isPending}
              loadingText="Memulihkan..."
              onClick={() => {
                if (cvId && confirmId) {
                  restoreMutation.mutate({ cvId, versionId: confirmId });
                }
              }}
            >
              Pulihkan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
