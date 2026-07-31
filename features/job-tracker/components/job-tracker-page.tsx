"use client";

import type { JobApplication } from "@prisma/client";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardToolbar } from "@/features/job-tracker/components/board-toolbar";
import { ColumnHeader } from "@/features/job-tracker/components/column-header";
import { StatsCards } from "@/features/job-tracker/components/stats-cards";
import { UpsellView } from "@/features/job-tracker/components/upsell-view";

const KanbanBoard = lazy(() =>
  import("@/features/job-tracker/components/kanban-board").then((m) => ({
    default: m.KanbanBoard,
  })),
);

const ApplicationDialog = lazy(() =>
  import("@/features/job-tracker/components/application-dialog").then((m) => ({
    default: m.ApplicationDialog,
  })),
);

const ApplicationDetailSheet = lazy(() =>
  import("@/features/job-tracker/components/application-detail-sheet").then(
    (m) => ({
      default: m.ApplicationDetailSheet,
    }),
  ),
);

import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

function BoardSkeleton() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <div className="flex items-start gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="w-72 shrink-0 space-y-2 rounded-xl bg-muted/40 p-3"
          >
            <div className="flex items-center justify-between gap-1 px-1">
              <Skeleton className="h-4 w-20" />
              <div className="flex shrink-0 items-center gap-1">
                <Skeleton className="h-3 w-4" />
                <Skeleton className="size-6" />
              </div>
            </div>
            {Array.from({ length: 2 }, (_, j) => (
              <div
                key={j}
                className="space-y-2 rounded-lg bg-card px-3 py-3 ring-1 ring-foreground/10"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
        <Skeleton className="h-7 w-40 shrink-0" />
      </div>
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
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
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
      <Suspense fallback={<BoardSkeleton />}>
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
          onCardEdit={(app) => {
            setEditingApp(app);
            setDialogOpen(true);
          }}
        />
      </Suspense>
      <Suspense fallback={null}>
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
      </Suspense>
      <Suspense fallback={null}>
        <ApplicationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          columns={columns}
          defaultColumnId={defaultColumnId}
          application={editingApp}
        />
      </Suspense>
    </div>
  );
}
