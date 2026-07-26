import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading UI for the CV dashboard (mirrors the real layout). */
export default function BuilderLoading() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-24" />
      </header>

      <div className="flex-1 p-6">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
