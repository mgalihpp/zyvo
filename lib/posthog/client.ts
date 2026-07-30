import posthog from "posthog-js";

const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

if (typeof window !== "undefined" && apiKey && !posthog.__loaded) {
  posthog.init(apiKey, {
    api_host: host,
    autocapture: true,
    capture_pageview: false, // We handle pageview capture manually
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });
}

export { posthog };
