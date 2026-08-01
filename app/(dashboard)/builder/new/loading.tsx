import { Skeleton } from "@/components/ui/skeleton";

/** Route-level shell matching the first step of the new-CV wizard. */
export default function BuilderNewLoading() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>

      <div className="mx-auto mt-6 flex items-center gap-2">
        <Skeleton className="h-1.5 w-8 rounded-full" />
        <Skeleton className="h-1.5 w-8 rounded-full" />
        <Skeleton className="h-1.5 w-8 rounded-full" />
      </div>

      <div className="mt-8 space-y-3 text-center">
        <Skeleton className="mx-auto h-9 w-80 max-w-full" />
        <Skeleton className="mx-auto h-5 w-64 max-w-full" />
      </div>

      <div className="mt-8 flex-1 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {["manual", "import"].map((method) => (
            <div
              key={method}
              className="flex min-h-[190px] flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-6"
            >
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="mx-auto block h-5 w-36" />
      </div>
    </div>
  );
}
