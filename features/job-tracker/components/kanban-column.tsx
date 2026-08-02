"use client";

import { useDndContext } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { JobApplication } from "@prisma/client";
import { ApplicationCard } from "@/features/job-tracker/components/application-card";
import {
  COLUMN_COLORS,
  getColumnColor,
} from "@/features/job-tracker/lib/column-colors";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  column,
  applications,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onCardCopy,
  header,
}: {
  column: BoardColumn;
  applications: JobApplication[];
  onCardClick: (app: JobApplication) => void;
  onCardEdit?: (app: JobApplication) => void;
  onCardDelete?: (app: JobApplication) => void;
  onCardCopy?: (app: JobApplication) => void;
  /** Optional custom header (rename/delete menu); falls back to a plain title. */
  header?: React.ReactNode;
}) {
  // Sortable = droppable (cards land here) + draggable (reorder columns).
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: column.id, data: { type: "column" } });
  const { over: activeDropTarget } = useDndContext();

  // Only highlight when a *card* hovers the column, not another column.
  const isCardDrag = active?.data.current?.type !== "column";
  const isCardOver =
    isCardDrag &&
    (isOver ||
      applications.some((app) => app.id === String(activeDropTarget?.id)));

  const color = COLUMN_COLORS[getColumnColor(column)];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex max-h-full w-72 shrink-0 flex-col gap-2 overflow-hidden rounded-xl bg-muted/40 px-3 pb-3",
        isCardOver && "ring-2 ring-primary/40 ring-inset",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      {/* Column accent bar — full-bleed across the top. */}
      <div className={cn("-mx-3 h-1 shrink-0", color.bar)} aria-hidden="true" />
      {/* Drag handle: the header area moves the column. */}
      <div {...attributes} {...listeners} className="cursor-grab">
        {header ?? (
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span
                className={cn("size-2 rounded-full", color.dot)}
                aria-hidden="true"
              />
              {column.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {applications.length}
            </span>
          </div>
        )}
      </div>
      {/* -m-1 + p-1 keeps the cards' outer 1px ring visible inside the
           overflow-y-auto scroll container instead of being clipped. */}
      <div className="-m-1 flex min-h-24 flex-col gap-2 overflow-y-auto p-1">
        <SortableContext
          items={applications.map((app) => app.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onClick={() => onCardClick(app)}
              onEdit={onCardEdit}
              onDelete={onCardDelete}
              onCopy={onCardCopy}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
