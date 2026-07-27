import { Skeleton } from "@/components/ui/skeleton";

/** A CV card skeleton: landscape thumbnail + title + action row. */
function CvCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** A template card skeleton: landscape thumbnail + name/desc + use button. */
function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="mt-1 h-8 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Route-level loading UI for the dashboard (rendered inside the sidebar shell). */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      {/* Greeting. */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* "Kelola CV Anda" — CvList with limit 4 (+ new-CV card). */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["a", "b", "c"].map((id) => (
            <CvCardSkeleton key={id} />
          ))}
        </div>
      </div>

      {/* "Template Pilihan" — TemplateGallery with limit 3, no filters. */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["a", "b", "c"].map((id) => (
            <TemplateCardSkeleton key={id} />
          ))}
        </div>
      </div>
    </div>
  );
}
