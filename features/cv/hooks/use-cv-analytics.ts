"use client";

import { posthog } from "@/lib/posthog/client";

export function useCVAnalytics() {
  return {
    track: (event: string, properties: Record<string, unknown> = {}) => {
      if (posthog) {
        posthog.capture(event, {
          ...properties,
          distinct_id: posthog.get_distinct_id(),
        });
      }
    },
    setUserProperties: (props: Record<string, unknown>) => {
      if (posthog) {
        posthog.identify(posthog.get_distinct_id(), props);
      }
    },
    isFeatureEnabled: (flag: string) =>
      posthog?.isFeatureEnabled(flag) ?? false,
    reloadFeatureFlags: () => posthog?.reloadFeatureFlags(),
  };
}
