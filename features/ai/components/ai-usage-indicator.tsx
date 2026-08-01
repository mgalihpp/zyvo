"use client";

import { InfoIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { getAiUsageState } from "./ai-usage-indicator-state";

type AiUsageIndicatorProps = {
  className?: string;
  align?: ComponentProps<typeof HoverCardContent>["align"];
  side?: ComponentProps<typeof HoverCardContent>["side"];
};

/** Compact monthly AI-quota readout for use beside AI controls. */
export function AiUsageIndicator({
  className,
  align = "center",
  side = "bottom",
}: AiUsageIndicatorProps) {
  const { data, isError, isLoading } = trpc.ai.quotaStatus.useQuery();
  const unavailable = isLoading || isError || !data;
  const usage = data ? getAiUsageState(data) : null;

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("text-muted-foreground", className)}
            aria-label="Lihat penggunaan AI"
          />
        }
      >
        <InfoIcon aria-hidden="true" />
      </HoverCardTrigger>
      {!unavailable && (
        <HoverCardContent align={align} side={side} className="w-64 p-3">
          {usage?.kind === "unlimited" ? (
            <UnlimitedQuota progressValue={usage.progressValue} />
          ) : (
            usage && (
              <LimitedQuota
                used={usage.used}
                limit={usage.limit}
                percentage={usage.progressValue}
              />
            )
          )}
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

function UnlimitedQuota({ progressValue }: { progressValue: null }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
          Kuota AI
        </p>
        <span className="font-medium text-primary">Tidak terbatas</span>
      </div>
      <Progress
        value={progressValue}
        aria-valuetext="Kuota AI tidak terbatas"
        className="[&_[data-slot=progress-indicator]]:w-full [&_[data-slot=progress-indicator]]:animate-pulse"
      />
      <p className="text-muted-foreground">
        Gunakan fitur AI tanpa batas bulan ini
      </p>
    </div>
  );
}

function LimitedQuota({
  used,
  limit,
  percentage,
}: {
  used: number;
  limit: number;
  percentage: number;
}) {
  const remaining = Math.max(0, limit - used);
  const exhausted = used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-foreground">Kuota AI</p>
        <span className="tabular-nums text-muted-foreground">
          {used} dari {limit} dipakai
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          exhausted && "[&_[data-slot=progress-indicator]]:bg-destructive",
        )}
      />
      {exhausted ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-destructive">Kuota AI bulan ini habis</p>
          <Link
            href="/dashboard/billing"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Tingkatkan paket
          </Link>
        </div>
      ) : (
        <p className="tabular-nums text-muted-foreground">
          Sisa {remaining} panggilan bulan ini
        </p>
      )}
      <p className="text-muted-foreground">Reset tiap awal bulan</p>
    </div>
  );
}
