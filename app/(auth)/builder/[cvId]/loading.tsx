import { Skeleton } from "@/components/ui/skeleton";

export default function CvBuilderLoading() {
  return (
    <div className="flex h-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <div className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r bg-background py-3">
          <Skeleton className="mb-2 size-9 rounded-md" />
          {[
            "personal",
            "sections",
            "template",
            "typography",
            "colors",
            "ai",
            "export",
          ].map((id) => (
            <Skeleton key={id} className="size-9 rounded-md" />
          ))}
        </div>

        <div className="flex w-full max-w-sm shrink-0 flex-col border-r">
          <div className="flex items-center gap-3 border-b px-4 py-2.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2 border-b p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-4 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>

        <div className="hidden flex-1 items-start justify-center bg-neutral-100 p-6 md:flex dark:bg-neutral-900">
          <Skeleton className="aspect-[1/1.414] w-full max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
