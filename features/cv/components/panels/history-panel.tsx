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

interface ChangeEntry {
  kind: "restore" | "remove" | "edit" | "info";
  text: string;
}

interface VersionChange {
  label: string;
  entries: ChangeEntry[];
}

/** Diff gutter marker + color per entry kind, mirroring a code diff. */
const KIND_STYLE: Record<ChangeEntry["kind"], { sign: string; cls: string }> = {
  restore: {
    sign: "+",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  remove: { sign: "-", cls: "bg-red-500/10 text-red-700 dark:text-red-400" },
  edit: {
    sign: "~",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
  info: { sign: " ", cls: "text-muted-foreground" },
};

/** Total diff lines across all changed sections. */
function countEntries(changes: VersionChange[]) {
  return changes.reduce((n, c) => n + c.entries.length, 0);
}

export function HistoryPanel() {
  const cvId = useCvStore((s) => s.cvId);
  const replaceContent = useCvStore((s) => s.replaceContent);
  const lastSavedAt = useCvStore((s) => s.lastSavedAt);
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

      <div className="space-y-3 p-4">
        {/* The live CV, pinned above the saved snapshots so "sekarang" is
            never confused with the newest snapshot below it. */}
        <div className="rounded-lg border border-primary/50 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            <p className="text-sm font-medium">Versi sekarang</p>
            <Badge className="h-4 px-1.5 text-[10px]">Aktif</Badge>
          </div>
          <p className="mt-0.5 pl-3.5 text-xs text-muted-foreground">
            {lastSavedAt
              ? `Tersimpan ${formatRelative(new Date(lastSavedAt))}`
              : "CV yang sedang Anda edit"}
          </p>
        </div>

        {versions.isLoading ? (
          <div className="space-y-3">
            {["a", "b", "c"].map((id) => (
              <Skeleton key={id} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Gagal memuat riwayat. Coba lagi nanti.
          </p>
        ) : versions.data && versions.data.length > 0 ? (
          <ol className="space-y-2">
            {versions.data.map((v) => {
              const total = countEntries(v.changes);
              return (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatRelative(new Date(v.createdAt))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {total > 0
                        ? `${total} perubahan · ${v.changes.length} bagian`
                        : "Sama dengan versi sekarang"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setConfirmId(v.id)}
                  >
                    Lihat
                  </Button>
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
        <AlertDialogContent className="sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan versi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Perbandingan versi sekarang dengan versi yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmVersion ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 shrink-0" />
                  {formatVersionDate(new Date(confirmVersion.createdAt))}
                </span>
                <span>
                  {countEntries(confirmVersion.changes)} perubahan di{" "}
                  {confirmVersion.changes.length} bagian
                </span>
              </div>

              {confirmVersion.changes.length > 0 ? (
                <div className="max-h-[45vh] overflow-auto rounded-lg border bg-muted/20 font-mono text-xs scrollbar-thin">
                  {confirmVersion.changes.map((section) => (
                    <div key={section.label} className="border-b last:border-0">
                      <div className="sticky top-0 border-b bg-muted/80 px-3 py-1.5 font-sans text-[11px] font-medium backdrop-blur">
                        {section.label}
                      </div>
                      <div className="divide-y divide-border/40">
                        {section.entries.map((e, i) => {
                          const style = KIND_STYLE[e.kind];
                          return (
                            <div
                              key={`${e.kind}-${e.text}-${i}`}
                              className={`flex gap-2 px-3 py-1.5 ${style.cls}`}
                            >
                              <span
                                aria-hidden
                                className="w-2 shrink-0 select-none font-bold"
                              >
                                {style.sign}
                              </span>
                              <span className="break-words">{e.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Versi ini sama dengan versi sekarang — tidak ada yang berubah.
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="text-emerald-700 dark:text-emerald-400">
                  + dikembalikan
                </span>
                <span className="text-red-700 dark:text-red-400">
                  - akan hilang
                </span>
                <span className="text-amber-700 dark:text-amber-500">
                  ~ diubah
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Versi sekarang akan disimpan sebagai versi baru terlebih dahulu,
                jadi tidak ada data yang hilang permanen.
              </p>
            </div>
          ) : null}

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
