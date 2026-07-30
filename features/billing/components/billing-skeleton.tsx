"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Mirror dari layout billing page: header toggle + 3 cards mobile + FAQ */
export function BillingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header + toggle */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-56 rounded-full" />
      </div>

      {/* Mobile cards (xl:hidden) */}
      <div className="flex flex-col gap-4 xl:hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border p-5 space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Desktop table (hidden xl:block) */}
      <div className="hidden overflow-hidden rounded-2xl border xl:block">
        {/* header row */}
        <div className="grid grid-cols-4">
          <div className="p-6" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-6 space-y-2 border-l">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-4 h-9 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        {/* feature rows */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-4 border-t">
            <div className="p-4">
              <Skeleton className="h-4 w-28" />
            </div>
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="flex items-center justify-center border-l p-4"
              >
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ))}
        {/* CTA row */}
        <div className="grid grid-cols-4 border-t">
          <div />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 border-l p-5"
            >
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl space-y-6 pt-16">
        <Skeleton className="h-8 w-72" />
        <div className="divide-y">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="py-5 flex items-center justify-between gap-4"
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="size-4 shrink-0 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
