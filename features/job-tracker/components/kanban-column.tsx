"use client";

import { useDroppable } from "@dnd-kit/core";
import type { JobApplication } from "@prisma/client";
import { ApplicationCard } from "@/features/job-tracker/components/application-card";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  column,
  applications,
  onCardClick,
  header,
}: {
  column: BoardColumn;
  applications: JobApplication[];
  onCardClick: (app: JobApplication) => void;
  /** Optional custom header (rename/delete menu); falls back to a plain title. */
  header?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-3",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      {header ?? (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-semibold">{column.name}</span>
          <span className="text-xs text-muted-foreground">
            {applications.length}
          </span>
        </div>
      )}
      <div className="flex min-h-24 flex-col gap-2">
        {applications.map((app) => (
          <ApplicationCard
            key={app.id}
            app={app}
            onClick={() => onCardClick(app)}
          />
        ))}
      </div>
    </div>
  );
}
