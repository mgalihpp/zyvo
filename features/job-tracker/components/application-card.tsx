"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { JobApplication } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

export function ApplicationCard({
  app,
  onClick,
}: {
  app: JobApplication;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: app.id });

  const needsFollowUp =
    app.followUpDate && new Date(app.followUpDate) <= new Date();

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`cursor-pointer gap-0 py-3 transition-shadow hover:shadow-md ${
        isDragging ? "z-50 opacity-70 shadow-lg" : ""
      }`}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <CardContent className="space-y-2 px-3">
        <div>
          <p className="text-sm font-semibold leading-tight">{app.position}</p>
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
