"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UpsellView } from "@/features/job-tracker/components/upsell-view";
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

  return (
    <div className="px-4 py-6">
      <pre>{JSON.stringify(data.board.columns, null, 2)}</pre>
    </div>
  );
}
