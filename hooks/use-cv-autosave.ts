"use client";

import { useEffect, useRef } from "react";
import { useCvStore } from "@/lib/stores/cv-store";
import { trpc } from "@/lib/trpc/client";

const DEBOUNCE_MS = 800;

/**
 * Subscribes to CV store mutations and persists the draft to the server with a
 * debounce. Save status is written back into the store so UI can reflect it.
 */
export function useCvAutosave() {
  const cvId = useCvStore((s) => s.cvId);
  const revision = useCvStore((s) => s.revision);
  const updateMutation = trpc.cv.update.useMutation();
  const mutateRef = useRef(updateMutation.mutate);
  mutateRef.current = updateMutation.mutate;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirst = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: autosave should only fire on content revision / cv id changes; the mutate fn is read from a ref to avoid re-subscribing
  useEffect(() => {
    // Ignore the initial hydration render — nothing to save yet.
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (!cvId) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const store = useCvStore.getState();
      store.setSaveStatus("saving");
      mutateRef.current(
        { id: cvId, data: store.getContent() },
        {
          onSuccess: () => useCvStore.getState().markSaved(),
          onError: () => useCvStore.getState().setSaveStatus("error"),
        },
      );
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [revision, cvId]);
}
