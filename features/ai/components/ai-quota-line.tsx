"use client";

import { trpc } from "@/lib/trpc/client";

/**
 * Remaining monthly AI quota readout. Renders nothing for unlimited plans
 * (limit === null) or while loading.
 */
export function AiQuotaLine({ className }: { className?: string }) {
  const { data } = trpc.ai.quotaStatus.useQuery();

  if (!data || data.limit === null) return null;

  const remaining = Math.max(0, data.limit - data.used);
  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      {remaining} panggilan AI tersisa bulan ini
    </p>
  );
}
