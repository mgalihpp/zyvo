"use client";

import {
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  HistoryIcon,
  InfoIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CvContent } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

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
  file: string;
  entries: ChangeEntry[];
}

/** Diff gutter marker + row color per entry kind, mirroring a code diff. */
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

/** Net +N/-N counters for a section's entries (shown in the file header). */
function sectionCounts(entries: ChangeEntry[]) {
  let plus = 0;
  let minus = 0;
  for (const e of entries) {
    if (e.kind === "restore") plus++;
    else if (e.kind === "remove") minus++;
  }
  return { plus, minus };
}

/**
 * Code-diff style rendering of one changed section: a "file" header
 * (pengalaman.cv  +2 -1) above numbered, colored diff rows.
 */
function DiffFile({
  change,
  withLineNumbers = false,
  maxEntries,
}: {
  change: VersionChange;
  withLineNumbers?: boolean;
  maxEntries?: number;
}) {
  const { plus, minus } = sectionCounts(change.entries);
  const entries =
    maxEntries !== undefined
      ? change.entries.slice(0, maxEntries)
      : change.entries;
  const hidden = change.entries.length - entries.length;

  return (
    <div className="overflow-hidden rounded-md border bg-muted/20 font-mono text-xs">
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-2.5 py-1.5">
        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{change.file}</span>
        <span className="ml-auto flex shrink-0 gap-2">
          {plus > 0 ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              +{plus}
            </span>
          ) : null}
          {minus > 0 ? (
            <span className="text-red-700 dark:text-red-400">-{minus}</span>
          ) : null}
        </span>
      </div>
      <div>
        {entries.map((e, i) => {
          const style = KIND_STYLE[e.kind];
          return (
            <div
              key={`${e.kind}-${e.text}-${i}`}
              className={cn("flex", style.cls)}
            >
              {withLineNumbers ? (
                <span
                  aria-hidden
                  className="w-7 shrink-0 select-none border-r border-border/40 bg-muted/40 px-1.5 py-1 text-right text-muted-foreground/70"
                >
                  {i + 1}
                </span>
              ) : null}
              <span className="flex min-w-0 gap-1.5 px-2.5 py-1">
                <span aria-hidden className="shrink-0 select-none font-bold">
                  {style.sign}
                </span>
                <span className="break-words">{e.text}</span>
              </span>
            </div>
          );
        })}
        {hidden > 0 ? (
          <div className="px-2.5 py-1 text-muted-foreground">
            … {hidden} baris lainnya
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const cvId = useCvStore((s) => s.cvId);
  const replaceContent = useCvStore((s) => s.replaceContent);
  const setPreviewContent = useCvStore((s) => s.setPreviewContent);
  const previewContent = useCvStore((s) => s.previewContent);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** Version whose content is being fetched for the editor preview. */
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  /** Version currently shown in the CV editor preview. */
  const [previewId, setPreviewId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const versions = trpc.cv.listVersions.useQuery(
    { cvId: cvId ?? "" },
    { enabled: !!cvId },
  );

  const confirmVersion = useMemo(
    () => versions.data?.find((v) => v.id === confirmId) ?? null,
    [versions.data, confirmId],
  );

  // Show a version in the live CV editor preview (read-only, nothing saved).
  const previewVersion = async (versionId: string) => {
    if (!cvId) return;
    // Toggle off if this version is already being previewed.
    if (previewContent && previewId === versionId) {
      setPreviewContent(null);
      setPreviewId(null);
      return;
    }
    setLoadingPreviewId(versionId);
    try {
      const version = await utils.cv.getVersion.fetch({ cvId, versionId });
      setPreviewContent(version.content as CvContent);
      setPreviewId(versionId);
    } finally {
      setLoadingPreviewId(null);
    }
  };

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
      setPreviewId(null);
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
              <Skeleton key={id} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Gagal memuat riwayat. Coba lagi nanti.
          </p>
        ) : versions.data && versions.data.length > 0 ? (
          <TooltipProvider delay={300}>
            <ol className="space-y-3">
              {versions.data.map((v, index) => {
                const isNewest = index === 0;
                return (
                  <li
                    key={v.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      isNewest
                        ? "border-primary/50"
                        : "hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {formatRelative(new Date(v.createdAt))}
                          </p>
                          {isNewest ? (
                            <Badge className="h-4 px-1.5 text-[10px]">
                              Terbaru
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatVersionDate(new Date(v.createdAt))}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant={
                                  previewId === v.id ? "default" : "outline"
                                }
                                aria-label="Pratinjau di editor"
                                loading={loadingPreviewId === v.id}
                                onClick={() => previewVersion(v.id)}
                              />
                            }
                          >
                            <EyeIcon />
                          </TooltipTrigger>
                          <TooltipContent>
                            {previewId === v.id
                              ? "Tutup pratinjau"
                              : "Pratinjau di editor"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant="outline"
                                aria-label="Pulihkan versi ini"
                                onClick={() => setConfirmId(v.id)}
                              />
                            }
                          >
                            <RotateCcwIcon />
                          </TooltipTrigger>
                          <TooltipContent>Pulihkan versi ini</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      {v.changes.length > 0 ? (
                        v.changes
                          .slice(0, 2)
                          .map((change) => (
                            <DiffFile
                              key={change.label}
                              change={change}
                              maxEntries={3}
                            />
                          ))
                      ) : (
                        <div className="overflow-hidden rounded-md border bg-muted/20 font-mono text-xs">
                          <div className="px-2.5 py-1.5 text-muted-foreground">
                            Tidak ada perubahan pada bagian ini
                          </div>
                        </div>
                      )}
                      {v.changes.length > 2 ? (
                        <p className="text-xs text-muted-foreground">
                          +{v.changes.length - 2} bagian lainnya
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </TooltipProvider>
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

      <Dialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl" scrollable>
          <DialogHeader>
            <DialogTitle>Pulihkan versi ini?</DialogTitle>
            <DialogDescription>
              Periksa perubahan di bawah sebelum memulihkan.
            </DialogDescription>
          </DialogHeader>

          {confirmVersion ? (
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClockIcon className="size-3.5 shrink-0" />
                Versi {formatVersionDate(new Date(confirmVersion.createdAt))}
              </p>

              {confirmVersion.changes.length > 0 ? (
                <div className="space-y-3">
                  {confirmVersion.changes.map((change) => (
                    <DiffFile
                      key={change.label}
                      change={change}
                      withLineNumbers
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Versi ini sama dengan versi sekarang — tidak ada yang berubah.
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
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

              <p className="flex gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                Konten CV saat ini akan disimpan sebagai versi baru terlebih
                dahulu, jadi tidak ada data yang hilang.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
              disabled={restoreMutation.isPending}
            >
              Batal
            </DialogClose>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
