"use client";

import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

export function ColumnHeader({
  column,
  columns,
  count,
}: {
  column: BoardColumn;
  columns: BoardColumn[];
  count: number;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateColumns = trpc.jobTracker.updateColumns.useMutation({
    onSuccess: () => {
      setConfirmDelete(false);
      utils.jobTracker.getBoard.invalidate();
      utils.jobTracker.getStats.invalidate();
    },
    onError: (err) => toast.add({ title: err.message }),
  });

  function commitRename() {
    setEditing(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === column.name) {
      setName(column.name);
      return;
    }
    updateColumns.mutate({
      columns: columns.map((c) =>
        c.id === column.id ? { ...c, name: trimmed } : c,
      ),
    });
  }

  function deleteColumn() {
    const remaining = columns
      .filter((c) => c.id !== column.id)
      .sort((a, b) => a.order - b.order)
      .map((c, i) => ({ ...c, order: i }));
    updateColumns.mutate({ columns: remaining });
  }

  return (
    <div className="flex items-center justify-between gap-1 px-1">
      {editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setName(column.name);
              setEditing(false);
            }
          }}
          className="h-7 text-sm"
        />
      ) : (
        <button
          type="button"
          className="truncate text-sm font-semibold"
          onClick={() => {
            setName(column.name);
            setEditing(true);
          }}
        >
          {column.name}
        </button>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs text-muted-foreground">{count}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Aksi kolom ${column.name}`}
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setName(column.name);
                setEditing(true);
              }}
            >
              <PencilIcon />
              Ubah Nama
            </DropdownMenuItem>
            {column.kind === "custom" && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
                Hapus Kolom
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus kolom &quot;{column.name}&quot;?</DialogTitle>
            <DialogDescription>
              Lamaran di kolom ini akan dipindah ke kolom pertama.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={updateColumns.isPending}
              loadingText="Menghapus..."
              onClick={deleteColumn}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
