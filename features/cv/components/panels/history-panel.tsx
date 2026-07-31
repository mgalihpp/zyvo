"use client";

import { ClockIcon, HistoryIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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

/** "5 menit yang lalu" style relative label; falls back to the full date. */
function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari yang lalu`;
  return formatVersionDate(date);
}

interface VersionChange {
  label: string;
  detail: string;
}

/** "Pengalaman: PT A akan dihapus" rows, capped at `max` with a +N indicator. */
function ChangeList({
  changes,
  max = Number.POSITIVE_INFINITY,
}: {
  changes: VersionChange[];
  max?: number;
}) {
  const shown = changes.slice(0, max);
  const hidden = changes.length - shown.length;
  return (
    <ul className="space-y-1">
      {shown.map((c) => (
        <li key={c.label} className="flex gap-1.5 text-xs">
          <span className="shrink-0 font-medium text-foreground">
            {c.label}:
          </span>
          <span className="text-muted-foreground">{c.detail}</span>
        </li>
      ))}
      {hidden > 0 ? (
        <li className="text-xs text-muted-foreground">
          +{hidden} perubahan lainnya
        </li>
      ) : null}
    </ul>
  );
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

  const confirmVersion = useMemo(
    () => versions.data?.find((v) => v.id === confirmId) ?? null,
    [versions.data, confirmId],
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
              <Skeleton key={id} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Gagal memuat riwayat. Coba lagi nanti.
          </p>
        ) : versions.data && versions.data.length > 0 ? (
          <ol className="space-y-3">
            {versions.data.map((v, i) => {
              const isLatest = i === 0;
              return (
                <li
                  key={v.id}
                  className={
                    "rounded-lg border p-3 transition-colors " +
                    (isLatest
                      ? "border-primary/50 bg-primary/[0.03]"
                      : "hover:border-primary/40")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium">
                          {formatRelative(new Date(v.createdAt))}
                        </p>
                        {isLatest ? (
                          <Badge className="h-4 px-1.5 text-[10px]">
                            Terbaru
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatVersionDate(new Date(v.createdAt))}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setConfirmId(v.id)}
                    >
                      Pulihkan
                    </Button>
                  </div>
                  <div className="mt-2 border-t pt-2">
                    {v.changes.length > 0 ? (
                      <ChangeList changes={v.changes} max={3} />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sama dengan CV saat ini
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <HistoryIcon className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Belum ada versi tersimpan</p>
            <p className="max-w-56 text-xs text-muted-foreground">
              Versi dibuat otomatis saat Anda mengedit CV.
            </p>
          </div>
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
              Periksa perubahan di bawah sebelum memulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            {confirmVersion ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <ClockIcon className="size-3.5 shrink-0" />
                Versi {formatVersionDate(new Date(confirmVersion.createdAt))}
              </p>
            ) : null}
            {confirmVersion && confirmVersion.changes.length > 0 ? (
              <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium">
                  Yang akan berubah pada CV Anda:
                </p>
                <ChangeList changes={confirmVersion.changes} />
              </div>
            ) : (
              <p className="text-muted-foreground">
                Versi ini sama dengan CV saat ini — tidak ada yang berubah.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Jangan khawatir: konten CV saat ini akan disimpan sebagai versi
              baru terlebih dahulu, jadi tidak ada data yang hilang.
            </p>
          </div>
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
