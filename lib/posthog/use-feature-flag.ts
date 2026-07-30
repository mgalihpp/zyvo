"use client";

import { posthog } from "@/lib/posthog/client";

export function useFeatureFlag(flag: string): boolean {
  return posthog?.isFeatureEnabled(flag) ?? false;
}

export function useFeatureFlagVariant(
  flag: string,
): string | boolean | undefined {
  return posthog?.getFeatureFlag(flag);
}
