"use client";

import {
  MoreHorizontalIcon,
  PaletteIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
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
import {
  COLUMN_COLOR_LABELS,
  COLUMN_COLOR_NAMES,
  COLUMN_COLORS,
  getColumnColor,
} from "@/features/job-tracker/lib/column-colors";
import type {
  BoardColumn,
  ColumnColor,
} from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

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
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const updateColumns = trpc.jobTracker.updateColumns.useMutation({
    onSuccess: () => {
      setConfirmDelete(false);
      utils.jobTracker.getBoard.invalidate();
      utils.jobTracker.getStats.invalidate();
    },
    onError: (err) => toast.add({ title: err.message, type: "error" }),
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

  function setColor(color: ColumnColor) {
    setColorPickerOpen(false);
    updateColumns.mutate({
      columns: columns.map((c) => (c.id === column.id ? { ...c, color } : c)),
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
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
          onClick={() => {
            setName(column.name);
            setEditing(true);
          }}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              COLUMN_COLORS[getColumnColor(column)].dot,
            )}
            aria-hidden="true"
          />
          <span className="truncate">{column.name}</span>
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
            {/* One action item — the actual picker lives in a dialog. */}
            <DropdownMenuItem onClick={() => setColorPickerOpen(true)}>
              <PaletteIcon />
              Warna
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

      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Warna kolom &quot;{column.name}&quot;</DialogTitle>
            <DialogDescription>
              Pilih warna untuk menandai kolom ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3">
            {COLUMN_COLOR_NAMES.map((colorName) => {
              const selected = getColumnColor(column) === colorName;
              return (
                <button
                  key={colorName}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors hover:bg-accent",
                    selected && "border-primary bg-accent",
                  )}
                  onClick={() => setColor(colorName)}
                >
                  <span
                    className={cn(
                      "size-5 rounded-full",
                      COLUMN_COLORS[colorName].swatch,
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-muted-foreground">
                    {COLUMN_COLOR_LABELS[colorName]}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
