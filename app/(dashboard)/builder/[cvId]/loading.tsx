import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for the CV editor. Mirrors the real builder layout
 * (icon rail + ~30% editor column + preview) so the transition to the mounted
 * editor doesn't shift. On mobile only the editor column shows, matching the
 * default "Edit" tab.
 */
export default function CvBuilderLoading() {
  return (
    <div className="flex h-screen flex-col">
      {/* Save indicator / mobile tab toggle live here in the real layout. */}
      <div className="absolute right-4 top-3 z-10 flex items-center gap-3">
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Icon rail: back button + 7 panel icons. */}
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

        {/* Editor column: full width on mobile, 24% (24–40%) on desktop. */}
        <div className="flex w-full shrink-0 flex-col border-r md:w-auto md:min-w-[24%] md:max-w-[40%] md:basis-[24%]">
          {/* Sticky top bar: avatar + name/title + sign-out. */}
          <div className="flex items-center gap-1 border-b px-2 py-2">
            <div className="flex flex-1 items-center gap-3 px-2 py-1.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="size-9 shrink-0 rounded-lg" />
          </div>
          {/* Panel header. */}
          <div className="space-y-2 border-b p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          {/* Panel body. */}
          <div className="space-y-4 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>

        {/* Preview: hidden on mobile (Edit tab is default), fills the rest. */}
        <div className="hidden flex-1 items-start justify-center bg-neutral-100 p-6 md:flex dark:bg-neutral-900">
          <Skeleton className="aspect-[1/1.414] w-full max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
