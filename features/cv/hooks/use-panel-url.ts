"use client";

import { useEffect } from "react";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

/**
 * Reflects the builder's active panel into the `?panel=` query string so a
 * user's place survives a reload or a shared link.
 *
 * The initial panel is resolved from the URL on the server (see the builder
 * page) and seeded into the store, so there is no client-side adoption here —
 * that avoids the "personal -> URL panel" first-paint flicker. This hook only
 * writes subsequent store changes back to the URL with
 * `history.replaceState`, which reflects the panel without a Next.js navigation
 * (a navigation would re-run the server component and refetch the CV).
 */
export function usePanelUrl() {
  const activePanel = useCvStore((s) => s.activePanel);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("panel") === activePanel) return;

    params.set("panel", activePanel);
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, [activePanel]);
}
