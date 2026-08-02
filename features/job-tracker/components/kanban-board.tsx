"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import type { JobApplication } from "@prisma/client";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ApplicationCardContent } from "@/features/job-tracker/components/application-card";
import { KanbanColumn } from "@/features/job-tracker/components/kanban-column";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const TRASH_DROPPABLE_ID = "__trash__";

/** Red glow rising from the bottom of the board area, visible only mid-drag.
 *  Positioned absolutely — the board wrapper is the `relative` parent. */
function TrashDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: TRASH_DROPPABLE_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Thin strip pinned to the bottom edge so dropping a card onto the
        // last row of a column stays easy — the strip only owns the very edge.
        "pointer-events-none absolute inset-x-0 bottom-0 z-40 flex h-6 items-end justify-center",
        // Pure fade-in — no movement, nothing to clip or jump.
        "fade-in animate-in duration-400 ease-out",
        "transition-all duration-300 ease-out",
        // Soft red aura bleeding up from the bottom edge.
        "bg-gradient-to-t from-destructive/10 via-destructive/5 to-transparent",
        isOver && "h-12 from-destructive/15 via-destructive/5 to-transparent",
      )}
    >
      {/* Thin glow line hugging the bottom edge — the "landing strip". */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-px bg-destructive/25 shadow-[0_0_12px_2px_var(--destructive)] transition-opacity duration-300",
          isOver ? "opacity-80" : "opacity-40",
        )}
        aria-hidden="true"
      />
      {/* Just the icon — no chrome. */}
      <TrashIcon
        className={cn(
          "size-4 -translate-y-1 text-destructive/60 transition-all duration-300 ease-out",
          isOver && "-translate-y-1.5 scale-125 -rotate-12 text-destructive",
        )}
        aria-hidden="true"
      />
    </div>
  );
}

export function KanbanBoard({
  columns,
  applications,
  onCardClick,
  onCardEdit,
  renderColumnHeader,
  boardActions,
}: {
  columns: BoardColumn[];
  applications: JobApplication[];
  onCardClick: (app: JobApplication) => void;
  /** Opens the edit dialog (from the card's 3-dot menu). */
  onCardEdit?: (app: JobApplication) => void;
  /** Optional per-column header renderer (Task 11: rename/delete menu). */
  renderColumnHeader?: (column: BoardColumn, count: number) => React.ReactNode;
  /** Optional extra node at the right end of the board (Task 11: add column). */
  boardActions?: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  const [activeApp, setActiveApp] = useState<JobApplication | null>(null);
  const pendingMoves = useRef(0);
  // Ghost card that plays the dissolve animation after a trash drop.
  const [snapGhost, setSnapGhost] = useState<{
    app: JobApplication;
    x: number;
    y: number;
    width: number;
  } | null>(null);

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
    // Order updates touch overlapping ranges; serialize them so rapid drops
    // cannot run concurrent MongoDB transactions against the same board.
    scope: { id: "job-tracker-move-application" },
    onMutate: async (input) => {
      pendingMoves.current += 1;
      await utils.jobTracker.getBoard.cancel();
      const prev = utils.jobTracker.getBoard.getData();
      utils.jobTracker.getBoard.setData(undefined, (old) => {
        if (!old) return old;
        const moving = old.applications.find((a) => a.id === input.id);
        if (!moving) return old;

        const remaining = old.applications.filter((a) => a.id !== input.id);
        const targetApps = remaining
          .filter((a) => a.columnId === input.columnId)
          .sort((a, b) => a.order - b.order);
        const insertAt = Math.min(input.order, targetApps.length);
        targetApps.splice(insertAt, 0, {
          ...moving,
          columnId: input.columnId,
          order: insertAt,
        });

        const reordered = new Map(
          targetApps.map((app, order) => [app.id, { ...app, order }]),
        );

        return {
          ...old,
          applications: old.applications.map(
            (app) => reordered.get(app.id) ?? app,
          ),
        };
      });
      return { prev };
    },
    onError: () => {
      toast.add({ title: "Gagal memindahkan lamaran", type: "error" });
    },
    onSettled: () => {
      pendingMoves.current -= 1;
      if (pendingMoves.current === 0) {
        utils.jobTracker.getBoard.invalidate();
        utils.jobTracker.getStats.invalidate();
      }
    },
  });

  const deleteMutation = trpc.jobTracker.deleteApplication.useMutation({
    onError: () => {
      toast.add({ title: "Gagal menghapus lamaran", type: "error" });
      utils.jobTracker.getBoard.invalidate();
    },
    onSettled: () => {
      utils.jobTracker.getBoard.invalidate();
      utils.jobTracker.getStats.invalidate();
    },
  });

  // Undoable delete: hide the card immediately, commit the server delete only
  // after the undo window closes. Undo restores the cache without a request.
  const pendingDeletes = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  function handleTrashDrop(appId: string) {
    const prev = utils.jobTracker.getBoard.getData();
    utils.jobTracker.getBoard.setData(undefined, (old) => {
      if (!old) return old;
      return {
        ...old,
        applications: old.applications.filter((a) => a.id !== appId),
      };
    });

    const timer = setTimeout(() => {
      pendingDeletes.current.delete(appId);
      deleteMutation.mutate({ id: appId });
    }, 5000);
    pendingDeletes.current.set(appId, timer);

    const toastId = toast.add({
      title: "Lamaran dihapus",
      type: "success",
      timeout: 5000,
      actionProps: {
        children: "Urungkan",
        onClick: () => {
          toast.close(toastId);
          const pending = pendingDeletes.current.get(appId);
          if (!pending) return;
          clearTimeout(pending);
          pendingDeletes.current.delete(appId);
          if (prev) utils.jobTracker.getBoard.setData(undefined, prev);
          utils.jobTracker.getBoard.invalidate();
          toast.add({ title: "Lamaran dipulihkan", type: "success" });
        },
      },
    });
  }

  const addColumnMutation = trpc.jobTracker.updateColumns.useMutation({
    onSuccess: () => {
      utils.jobTracker.getBoard.invalidate();
    },
    onError: (err) => toast.add({ title: err.message, type: "error" }),
  });

  // Duplicate from the card's 3-dot menu — same data, same column, appended
  // at the end.
  const copyMutation = trpc.jobTracker.createApplication.useMutation({
    onSuccess: () => {
      utils.jobTracker.getBoard.invalidate();
      utils.jobTracker.getStats.invalidate();
      toast.add({ title: "Lamaran diduplikat", type: "success" });
    },
    onError: (err) => toast.add({ title: err.message, type: "error" }),
  });

  function handleCardCopy(app: JobApplication) {
    copyMutation.mutate({
      columnId: app.columnId,
      company: app.company,
      position: `${app.position} (salinan)`,
      jobUrl: app.jobUrl ?? "",
      location: app.location ?? undefined,
      workType:
        (app.workType as "remote" | "hybrid" | "onsite" | null) ?? undefined,
      salaryMin: app.salaryMin ?? undefined,
      salaryMax: app.salaryMax ?? undefined,
      cvId: app.cvId ?? undefined,
      followUpDate: app.followUpDate ?? undefined,
      appliedAt: app.appliedAt ?? undefined,
      notes: app.notes ?? undefined,
    });
  }

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

  function handleDragStart(event: DragStartEvent) {
    // Column drags animate in place via useSortable — nothing to track.
    if (event.active.data.current?.type === "column") return;
    setActiveApp(applications.find((a) => a.id === event.active.id) ?? null);
  }

  // Persist a column reorder (drag a column header onto another column).
  function handleColumnDragEnd(activeId: string, overId: string) {
    if (activeId === overId) return;
    const ids = sortedColumns.map((c) => c.id);
    const from = ids.indexOf(activeId);
    let to = ids.indexOf(overId);
    if (to === -1) {
      const overColumn = sortedColumns.find((column) =>
        appsByColumn.get(column.id)?.some((app) => app.id === overId),
      );
      if (!overColumn) return;
      to = ids.indexOf(overColumn.id);
    }
    if (from === -1 || to === -1) return;
    if (from === to) return;
    const reordered = [...sortedColumns];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // Optimistic: update the cached board's column order immediately.
    const next = reordered.map((c, i) => ({
      ...c,
      order: i,
      // nullish -> null: cache shape matches the Prisma-derived server type.
      color: c.color ?? null,
    }));
    utils.jobTracker.getBoard.setData(undefined, (old) =>
      old ? { ...old, board: { ...old.board, columns: next } } : old,
    );
    addColumnMutation.mutate({ columns: next });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "column") {
      handleColumnDragEnd(String(active.id), String(over.id));
      return;
    }

    const appId = String(active.id);
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    // Dropped on the trash zone — delete, with a dissolve ghost at the spot
    // where the card was released.
    if (String(over.id) === TRASH_DROPPABLE_ID) {
      const rect = active.rect.current.translated;
      if (rect) {
        setSnapGhost({ app, x: rect.left, y: rect.top, width: rect.width });
        setTimeout(() => setSnapGhost(null), 650);
      }
      handleTrashDrop(appId);
      return;
    }

    const overId = String(over.id);
    if (overId === appId) return;

    // Dropping on a column appends the card to that column.
    const overColumn = sortedColumns.find((column) => column.id === overId);
    if (overColumn) {
      const targetApps = appsByColumn.get(overColumn.id) ?? [];
      const sourceIndex = targetApps.findIndex(
        (candidate) => candidate.id === appId,
      );
      if (
        overColumn.id === app.columnId &&
        sourceIndex === targetApps.length - 1
      ) {
        return;
      }
      moveMutation.mutate({
        id: appId,
        columnId: overColumn.id,
        order: targetApps.length,
      });
      return;
    }

    // Dropping on another card inserts at that card's position.
    const targetColumn = sortedColumns.find((column) =>
      appsByColumn.get(column.id)?.some((candidate) => candidate.id === overId),
    );
    if (!targetColumn) return;
    const targetApps = appsByColumn.get(targetColumn.id) ?? [];
    const targetIndex = targetApps.findIndex(
      (candidate) => candidate.id === overId,
    );
    if (targetIndex === -1) return;

    const sourceIndex =
      targetColumn.id === app.columnId
        ? targetApps.findIndex((candidate) => candidate.id === appId)
        : -1;
    if (targetColumn.id === app.columnId && sourceIndex === targetIndex) return;

    moveMutation.mutate({
      id: appId,
      columnId: targetColumn.id,
      order: targetIndex,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveApp(null)}
      autoScroll
    >
      {/* Relative wrapper is exactly as tall as the visible board (columns +
          x-scrollbar), so the trash aura pins to the bottom of the board area
          and stays put while the board scrolls horizontally. */}
      <div className="relative min-h-0 flex-1">
        <div
          className="flex h-full items-start gap-4 overflow-x-auto pb-2"
          // Hide the x-scrollbar mid-drag so the trash aura owns the bottom
          // edge; dnd-kit's autoScroll still scrolls the container. Inline
          // style so it always wins over any scrollbar utility classes.
          style={{ scrollbarWidth: activeApp ? "none" : undefined }}
        >
          <SortableContext
            items={sortedColumns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedColumns.map((column) => {
              const apps = appsByColumn.get(column.id) ?? [];
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  applications={apps}
                  onCardClick={onCardClick}
                  onCardEdit={onCardEdit}
                  onCardDelete={(app) => handleTrashDrop(app.id)}
                  onCardCopy={handleCardCopy}
                  header={renderColumnHeader?.(column, apps.length)}
                />
              );
            })}
          </SortableContext>
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
        {/* Trash dropzone appears only while a card is being dragged. */}
        {activeApp && <TrashDropZone />}
      </div>
      {/* Rendered in a portal above everything — never clipped by overflow.
          dropAnimation off: the optimistic update already snaps the card to
          its new column, so the default "return to origin" animation reads
          as the card bouncing back. */}
      <DragOverlay dropAnimation={null}>
        {activeApp ? (
          <ApplicationCardContent
            app={activeApp}
            className="w-66 rotate-2 shadow-lg"
          />
        ) : null}
      </DragOverlay>
      {/* Thanos-snap ghost: dissolves at the release point after a trash drop. */}
      {snapGhost && (
        <div
          className="thanos-snap fixed z-50"
          style={{
            left: snapGhost.x,
            top: snapGhost.y,
            width: snapGhost.width,
          }}
        >
          <ApplicationCardContent app={snapGhost.app} className="shadow-lg" />
        </div>
      )}
    </DndContext>
  );
}
