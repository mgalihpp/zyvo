"use client";

import { useDraggable } from "@dnd-kit/core";
import type { JobApplication } from "@prisma/client";
import {
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

/** Presentational card body — shared by the draggable card and the DragOverlay. */
export function ApplicationCardContent({
  app,
  className,
}: {
  app: JobApplication;
  className?: string;
}) {
  const needsFollowUp =
    app.followUpDate && new Date(app.followUpDate) <= new Date();

  return (
    <Card className={cn("gap-0 py-3", className)}>
      <CardContent className="space-y-2 px-3">
        <div>
          <p className="pr-6 text-sm font-semibold leading-tight">
            {app.position}
          </p>
          <p className="text-xs text-muted-foreground">{app.company}</p>
        </div>
        {(app.location || app.workType || needsFollowUp) && (
          <div className="flex flex-wrap gap-1">
            {app.location && <Badge variant="outline">{app.location}</Badge>}
            {app.workType && (
              <Badge variant="secondary">
                {WORK_TYPE_LABELS[app.workType] ?? app.workType}
              </Badge>
            )}
            {needsFollowUp && (
              <Badge variant="destructive">Perlu follow-up</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ApplicationCard({
  app,
  onClick,
  onEdit,
  onDelete,
  onCopy,
}: {
  app: JobApplication;
  onClick?: () => void;
  onEdit?: (app: JobApplication) => void;
  onDelete?: (app: JobApplication) => void;
  onCopy?: (app: JobApplication) => void;
}) {
  // No transform here — the moving card is rendered by DragOverlay in the
  // board, so it can't be clipped by the column/board overflow containers.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    <div className="group/card relative">
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        onClick={onClick}
        className="block w-full cursor-pointer bg-transparent p-0 text-left"
      >
        <ApplicationCardContent
          app={app}
          className={cn(
            "transition-shadow hover:shadow-md",
            isDragging && "opacity-40",
          )}
        />
      </button>
      {/* Hover actions — outside the drag button so opening the menu never
          starts a drag or the card click. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Aksi lamaran ${app.position}`}
              className="absolute top-1.5 right-1.5 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/card:opacity-100 data-popup-open:opacity-100"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(app)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCopy?.(app)}>
            <CopyIcon />
            Duplikat
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete?.(app)}
          >
            <Trash2Icon />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
