"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { JobApplication } from "@prisma/client";
import { PlusIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { KanbanColumn } from "@/features/job-tracker/components/kanban-column";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

export function KanbanBoard({
  columns,
  applications,
  onCardClick,
  renderColumnHeader,
  boardActions,
}: {
  columns: BoardColumn[];
  applications: JobApplication[];
  onCardClick: (app: JobApplication) => void;
  /** Optional per-column header renderer (Task 11: rename/delete menu). */
  renderColumnHeader?: (column: BoardColumn, count: number) => React.ReactNode;
  /** Optional extra node at the right end of the board (Task 11: add column). */
  boardActions?: React.ReactNode;
}) {
  const utils = trpc.useUtils();

  // Click vs drag: require 5px movement before a drag starts so card onClick fires.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order),
    [columns],
  );

  const appsByColumn = useMemo(() => {
    const map = new Map<string, JobApplication[]>();
    for (const col of sortedColumns) map.set(col.id, []);
    for (const app of applications) {
      map.get(app.columnId)?.push(app);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [sortedColumns, applications]);

  const moveMutation = trpc.jobTracker.moveApplication.useMutation({
    onMutate: async (input) => {
      await utils.jobTracker.getBoard.cancel();
      const prev = utils.jobTracker.getBoard.getData();
      utils.jobTracker.getBoard.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          applications: old.applications.map((a) =>
            a.id === input.id
              ? { ...a, columnId: input.columnId, order: input.order }
              : a,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) utils.jobTracker.getBoard.setData(undefined, ctx.prev);
      toast.add({ title: "Gagal memindahkan lamaran" });
    },
    onSettled: () => {
      utils.jobTracker.getBoard.invalidate();
      utils.jobTracker.getStats.invalidate();
    },
  });

  const addColumnMutation = trpc.jobTracker.updateColumns.useMutation({
    onSuccess: () => {
      utils.jobTracker.getBoard.invalidate();
    },
    onError: (err) => toast.add({ title: err.message }),
  });

  function handleAddColumn() {
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.order), -1);
    addColumnMutation.mutate({
      columns: [
        ...columns,
        {
          id: crypto.randomUUID(),
          name: "Kolom Baru",
          kind: "custom",
          order: maxOrder + 1,
        },
      ],
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const appId = String(active.id);
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    // `over` is a column (droppable) — drop appends at the end of that column.
    const columnId = String(over.id);
    if (!sortedColumns.some((c) => c.id === columnId)) return;
    if (columnId === app.columnId) return;

    const targetApps = appsByColumn.get(columnId) ?? [];
    moveMutation.mutate({ id: appId, columnId, order: targetApps.length });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {sortedColumns.map((column) => {
          const apps = appsByColumn.get(column.id) ?? [];
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              applications={apps}
              onCardClick={onCardClick}
              header={renderColumnHeader?.(column, apps.length)}
            />
          );
        })}
        {boardActions}
        <Button
          variant="outline"
          className="w-40 shrink-0"
          loading={addColumnMutation.isPending}
          loadingText="Menambahkan..."
          onClick={handleAddColumn}
        >
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Tambah Kolom
        </Button>
      </div>
    </DndContext>
  );
}
