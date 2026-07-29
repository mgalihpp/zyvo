import { Skeleton } from "@/components/ui/skeleton";

function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton
        className="w-full rounded-lg"
        style={{ aspectRatio: "1 / 1.414" }}
      />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export default function TemplatesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {["a", "b", "c", "d"].map((id) => (
          <Skeleton key={id} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
          <TemplateCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
