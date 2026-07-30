"use client";

import {
  PostHogProvider as PostHogProviderCore,
  usePostHog,
} from "@posthog/react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { useSession } from "@/features/auth/lib/auth-client";

interface PostHogProviderProps {
  children: ReactNode;
}

// Must be in its own component so <Suspense> can wrap the useSearchParams call.
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog || !pathname) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}

function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}

function PostHogIdentify() {
  const posthog = usePostHog();
  const { data: session } = useSession();

  useEffect(() => {
    if (!posthog) return;

    if (session?.user) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    } else {
      posthog.reset();
    }
  }, [posthog, session]);

  return null;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <PostHogProviderCore
      apiKey={apiKey}
      options={{
        api_host: host,
        autocapture: true,
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
      }}
    >
      <PostHogPageView />
      <PostHogIdentify />
      {children}
    </PostHogProviderCore>
  );
}
