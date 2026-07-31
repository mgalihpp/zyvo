"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export function StatsCards() {
  const { data, isLoading } = trpc.jobTracker.getStats.useQuery(undefined, {
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const appliedCount = data.funnel[0]?.count ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Lamaran</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Funnel Konversi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {data.funnel.map((stage, i) => (
            <div key={stage.kind} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{stage.label}</span>
              <span className="font-medium">
                {stage.count}
                {i > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    (
                    {appliedCount > 0
                      ? `${Math.round((stage.count / appliedCount) * 100)}%`
                      : "—"}
                    )
                  </span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Perlu Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-3xl font-bold",
              data.dueFollowUps > 0 && "text-destructive",
            )}
          >
            {data.dueFollowUps}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
