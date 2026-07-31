"use client";

import type { JobApplication } from "@prisma/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationDetailSheet } from "@/features/job-tracker/components/application-detail-sheet";
import { ApplicationDialog } from "@/features/job-tracker/components/application-dialog";
import { BoardToolbar } from "@/features/job-tracker/components/board-toolbar";
import { ColumnHeader } from "@/features/job-tracker/components/column-header";
import { KanbanBoard } from "@/features/job-tracker/components/kanban-board";
import { StatsCards } from "@/features/job-tracker/components/stats-cards";
import { UpsellView } from "@/features/job-tracker/components/upsell-view";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 py-6">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

export function JobTrackerPage() {
  const { data, isLoading, error, refetch } = trpc.jobTracker.getBoard.useQuery(
    undefined,
    { retry: false },
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>();

  if (isLoading) return <BoardSkeleton />;

  if (error) {
    if (error.data?.code === "FORBIDDEN") return <UpsellView />;
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">{error.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const columns = data.board.columns as BoardColumn[];
  const defaultColumnId =
    [...columns].sort((a, b) => a.order - b.order)[0]?.id ?? "";
  const selectedApp = data.applications.find((a) => a.id === selectedAppId);

  return (
    <div className="space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Pelacak Lamaran</h1>
          <p className="text-sm text-muted-foreground">
            Kelola semua lamaran kerjamu di satu papan.
          </p>
        </div>
        <BoardToolbar
          onAdd={() => {
            setEditingApp(undefined);
            setDialogOpen(true);
          }}
        />
      </div>
      <StatsCards />
      <KanbanBoard
        columns={columns}
        applications={data.applications}
        renderColumnHeader={(column, count) => (
          <ColumnHeader column={column} columns={columns} count={count} />
        )}
        onCardClick={(app) => {
          setSelectedAppId(app.id);
          setSheetOpen(true);
        }}
      />
      <ApplicationDetailSheet
        app={selectedApp}
        columns={columns}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onEdit={(app) => {
          setSheetOpen(false);
          setEditingApp(app);
          setDialogOpen(true);
        }}
      />
      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        columns={columns}
        defaultColumnId={defaultColumnId}
        application={editingApp}
      />
    </div>
  );
}
