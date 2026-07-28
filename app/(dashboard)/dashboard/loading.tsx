import { Skeleton } from "@/components/ui/skeleton";

/** A CV card skeleton matching CvCard: portrait thumbnail + title + meta row. */
function CvCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton
        className="w-full rounded-lg"
        style={{ aspectRatio: "1 / 1.414" }}
      />
      <div className="flex items-start justify-between gap-1 px-0.5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="mt-0.5 size-8 shrink-0 rounded-md" />
      </div>
    </div>
  );
}

/** "New resume" button skeleton matching the actual newCard. */
function NewCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton
        className="w-full rounded-lg border-2 border-dashed"
        style={{ aspectRatio: "1 / 1.414" }}
      />
      <div className="h-9" />
    </div>
  );
}

/** Route-level loading UI for the dashboard (matches page.tsx structure). */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header: "My Resumes" + subtitle. */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* CvList grid: new card + 4 CV cards. */}
      <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <NewCardSkeleton />
        {["a", "b", "c", "d"].map((id) => (
          <CvCardSkeleton key={id} />
        ))}
      </div>
    </div>
  );
}
