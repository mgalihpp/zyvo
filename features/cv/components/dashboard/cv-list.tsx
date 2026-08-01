"use client";

import {
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import { EditableTitle } from "@/features/cv/components/editable-title";
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
import type { CvContent } from "@/features/cv/schemas/cv";
import type { SaveStatus } from "@/features/cv/stores/cv-store";
import type { RouterOutputs } from "@/lib/trpc/client";
import { trpc } from "@/lib/trpc/client";

type Cv = RouterOutputs["cv"]["list"][number];

function formatRelative(value: Date | string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CvCard({
  cv,
  onEdit,
  onDuplicate,
  onDelete,
  onRename,
  onDownload,
  busy,
}: {
  cv: Cv;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<unknown>;
  onDownload: () => void;
  busy: boolean;
}) {
  const [renameStatus, setRenameStatus] = useState<SaveStatus>("idle");

  async function handleRename(next: string) {
    setRenameStatus("saving");
    try {
      await onRename(next);
      setRenameStatus("saved");
      setTimeout(() => setRenameStatus("idle"), 1500);
    } catch {
      setRenameStatus("error");
    }
  }

  return (
    <div className="group flex flex-col gap-2">
      {/* Portrait thumbnail */}
      <div
        className="group/thumb relative cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md hover:ring-2 hover:ring-primary/30"
        onClick={onEdit}
      >
        <CvThumbnail
          cv={cv as unknown as CvContent}
          className="w-full"
          aspectRatio="1 / 1.414"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 p-6 text-center opacity-0 transition-all duration-200 group-hover/thumb:bg-black/60 group-hover/thumb:opacity-100">
          <span className="text-lg font-bold text-white">
            LIHAT CV &nbsp;&rarr;
          </span>
        </div>
      </div>

      {/* Meta row below thumbnail */}
      <div className="flex items-start justify-between gap-1 px-0.5">
        <div className="min-w-0 flex-1">
          <EditableTitle
            value={cv.title}
            onCommit={handleRename}
            status={renameStatus}
            ariaLabel="Ubah nama CV"
            className="text-sm font-semibold leading-tight"
          />
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Diperbarui {formatRelative(cv.updatedAt ?? cv.createdAt)} • A4
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Aksi CV"
                className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <CopyIcon />
              Duplikat CV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
            >
              <DownloadIcon />
              Unduh CV
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2Icon />
              Hapus CV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** CV list with quick actions. `limit` renders only the most recent N. */
export function CvList({
  initialCvs,
  limit,
  showNewButton = true,
}: {
  initialCvs: RouterOutputs["cv"]["list"];
  limit?: number;
  showNewButton?: boolean;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: cvs, isLoading } = trpc.cv.list.useQuery(undefined, {
    initialData: initialCvs,
  });

  const [pendingDelete, setPendingDelete] = useState<Cv | null>(null);
  const [downloading, setDownloading] = useState<Cv | null>(null);

  const analytics = useCVAnalytics();

  useEffect(() => {
    if (cvs) {
      analytics.setUserProperties({ cvs_count: cvs.length });
    }
  }, [cvs, analytics]);

  const upsell = usePlanUpsell();
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      analytics.track("cv_created", { cv_id: cv.id });
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
    onError: (err) => {
      if (!upsell.handleError(err))
        toast.add({ title: err.message, type: "error" });
    },
  });
  const duplicateMutation = trpc.cv.duplicate.useMutation({
    onSuccess: (cv) => {
      analytics.track("cv_duplicated", { cv_id: cv.id });
      utils.cv.list.invalidate();
    },
    onError: (err) => {
      if (!upsell.handleError(err))
        toast.add({ title: err.message, type: "error" });
    },
  });
  const deleteMutation = trpc.cv.delete.useMutation({
    onSuccess: (result) => {
      analytics.track("cv_deleted", { cv_id: result.id });
      utils.cv.list.invalidate();
      setPendingDelete(null);
    },
  });
  // Optimistic rename so the title updates instantly; rolls back on error.
  const renameMutation = trpc.cv.update.useMutation({
    onMutate: async ({ id, data }) => {
      await utils.cv.list.cancel();
      const prev = utils.cv.list.getData();
      utils.cv.list.setData(undefined, (old) =>
        old?.map((c) =>
          c.id === id ? { ...c, title: data.title ?? c.title } : c,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.cv.list.setData(undefined, ctx.prev);
    },
    onSettled: () => utils.cv.list.invalidate(),
  });

  const items = limit ? cvs?.slice(0, limit) : cvs;

  async function handleDownload(cv: Cv) {
    setDownloading(cv);
    try {
      const res = await fetch(`/api/cv/${cv.id}/export?format=pdf`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") ?? "";
      const name = dispo.match(/filename="([^"]+)"/)?.[1] ?? "cv.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      analytics.track("cv_exported", { cv_id: cv.id, format: "pdf" });
    } catch (err) {
      toast.add({
        title: "Gagal mengunduh CV",
        description: err instanceof Error ? err.message : undefined,
        type: "error",
      });
    } finally {
      setDownloading(null);
    }
  }

  // "New resume" card — dashed border, centered + icon
  const newCard = showNewButton ? (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => createMutation.mutate(undefined)}
        disabled={createMutation.isPending}
        style={{ aspectRatio: "1 / 1.414" }}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
          <PlusIcon className="size-5" />
        </span>
        CV Baru
      </button>
      <Link
        href="/dashboard/ai"
        className="mx-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        Atau buat dengan AI
      </Link>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {["a", "b", "c"].map((id) => (
          <div key={id} className="flex flex-col gap-2">
            <Skeleton
              className="w-full rounded-lg"
              style={{ aspectRatio: "1 / 1.414" }}
            />
            <div className="space-y-1.5 px-0.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="mt-2 h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {newCard}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {newCard}
        {items.map((cv) => (
          <CvCard
            key={cv.id}
            cv={cv}
            busy={
              duplicateMutation.isPending &&
              duplicateMutation.variables?.id === cv.id
            }
            onEdit={() => router.push(`/builder/${cv.id}`)}
            onDuplicate={() => duplicateMutation.mutate({ id: cv.id })}
            onDelete={() => setPendingDelete(cv)}
            onRename={(title) =>
              renameMutation.mutateAsync({ id: cv.id, data: { title } })
            }
            onDownload={() => handleDownload(cv)}
          />
        ))}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus CV?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) {
                  deleteMutation.mutate({ id: pendingDelete.id });
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={downloading !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Menyiapkan unduhan…</AlertDialogTitle>
            <AlertDialogDescription>
              {downloading
                ? `CV "${downloading.title}" sedang diproses. File akan segera diunduh.`
                : "CV sedang diproses."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <Loader2Icon className="size-8 animate-spin text-primary" />
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {upsell.dialog}
    </div>
  );
}
