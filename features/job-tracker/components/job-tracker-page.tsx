"use client";

import type { JobApplication } from "@prisma/client";
import { SparklesIcon } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { BoardToolbar } from "@/features/job-tracker/components/board-toolbar";
import { ColumnHeader } from "@/features/job-tracker/components/column-header";
import { JobTrackerSkeleton } from "@/features/job-tracker/components/job-tracker-skeleton";
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

const AiAssistantModal = lazy(() =>
  import("@/features/job-tracker/components/ai-assistant-modal").then((m) => ({
    default: m.AiAssistantModal,
  })),
);

import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

export function JobTrackerPage() {
  const { data, isLoading, error, refetch } = trpc.jobTracker.getBoard.useQuery(
    undefined,
    { retry: false },
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>();
  const [aiOpen, setAiOpen] = useState(false);

  if (isLoading) return <JobTrackerSkeleton />;

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
      <Suspense fallback={<JobTrackerSkeleton />}>
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
      <Button
        size="icon"
        aria-label="Asisten AI"
        onClick={() => setAiOpen(true)}
        className="fixed right-6 bottom-6 z-40 size-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg transition-transform hover:scale-105 hover:from-violet-600 hover:to-fuchsia-700"
      >
        <SparklesIcon className="size-5" />
      </Button>
      <Suspense fallback={null}>
        <AiAssistantModal
          open={aiOpen}
          onOpenChange={setAiOpen}
          applications={data.applications}
        />
      </Suspense>
    </div>
  );
}
