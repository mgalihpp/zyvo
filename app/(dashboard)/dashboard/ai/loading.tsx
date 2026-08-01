import { Skeleton } from "@/components/ui/skeleton";

export default function AiGeneratorLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Step indicator */}
      <div className="mx-auto mt-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <Skeleton key={s} className="h-1.5 w-8 rounded-full" />
        ))}
      </div>

      {/* Heading */}
      <div className="mx-auto mt-8 text-center">
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto mt-2 h-4 w-96 max-w-full" />
      </div>

      {/* Step body */}
      <div className="mt-8 flex-1">
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-2">
            {["a", "b", "c", "d"].map((id) => (
              <Skeleton key={id} className="h-7 w-20 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-[1/1.414] w-full rounded-lg" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
