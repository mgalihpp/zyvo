"use client";

import {
  CopyIcon,
  FileTextIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import { EditableTitle } from "@/features/cv/components/editable-title";
import type { CvContent } from "@/features/cv/schemas/cv";
import type { SaveStatus } from "@/features/cv/stores/cv-store";
import type { RouterOutputs } from "@/lib/trpc/client";
import { trpc } from "@/lib/trpc/client";

type Cv = RouterOutputs["cv"]["list"][number];

function formatDate(value: Date | string) {
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
  busy,
}: {
  cv: Cv;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<unknown>;
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
    <Card
      size="sm"
      className="group cursor-pointer pt-0 transition-shadow hover:ring-primary/40 hover:shadow-md"
      onClick={onEdit}
    >
      {/* Live preview thumbnail. `cv` carries the full content via cv.list. */}
      <div className="overflow-hidden border-b bg-muted">
        <CvThumbnail
          cv={cv as unknown as CvContent}
          className="w-full"
          aspectRatio="4 / 3"
        />
      </div>

      <div className="flex items-center gap-2 px-(--card-spacing)">
        <div className="min-w-0 flex-1">
          <EditableTitle
            value={cv.title}
            onCommit={handleRename}
            status={renameStatus}
            ariaLabel="Ubah nama CV"
            className="text-sm font-medium"
          />
          <p className="mt-0.5 truncate text-xs text-primary">
            Dibuat pada {formatDate(cv.createdAt)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Aksi CV"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
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
    </Card>
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

  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
  });
  const duplicateMutation = trpc.cv.duplicate.useMutation({
    onSuccess: () => utils.cv.list.invalidate(),
  });
  const deleteMutation = trpc.cv.delete.useMutation({
    onSuccess: () => {
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

  const newCard = showNewButton ? (
    <button
      type="button"
      onClick={() => createMutation.mutate(undefined)}
      disabled={createMutation.isPending}
      className="flex min-h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PlusIcon className="size-5" />
      </span>
      Buat CV Baru
    </button>
  ) : null;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c"].map((id) => (
          <div key={id} className="overflow-hidden rounded-xl border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex items-center gap-2 p-4">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="size-6 shrink-0 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <FileTextIcon className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Belum ada CV</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Buat CV pertama Anda untuk memulai.
        </p>
        {showNewButton ? (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => createMutation.mutate(undefined)}
              loading={createMutation.isPending}
            >
              <PlusIcon /> CV Baru
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
