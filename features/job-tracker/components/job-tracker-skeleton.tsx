import { Skeleton } from "@/components/ui/skeleton";

/** Mirror dari layout job tracker: header + stats cards + kanban board */
export function JobTrackerSkeleton() {
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
      <div className="flex flex-wrap items-start gap-4">
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
