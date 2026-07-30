"use client";

import { CheckIcon, LockIcon } from "lucide-react";
import type { FeatureValue } from "@/features/billing/lib/billing-constants";
import { cn } from "@/lib/utils";

export function FeatureIcon({
  value,
  isPro,
}: {
  value: FeatureValue;
  isPro: boolean;
}) {
  if (value === null)
    return (
      <LockIcon
        className={cn(
          "mx-auto size-4",
          isPro ? "text-primary-foreground/60" : "text-muted-foreground/70",
        )}
      />
    );
  if (value === true)
    return (
      <CheckIcon
        className={cn(
          "mx-auto size-4",
          isPro ? "text-primary-foreground" : "text-foreground",
        )}
      />
    );
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        isPro ? "text-primary-foreground" : "",
      )}
    >
      {value}
    </span>
  );
}
