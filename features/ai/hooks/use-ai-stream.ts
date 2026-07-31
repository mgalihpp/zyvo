"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export type ImproveAction = "improve" | "shorten" | "expand" | "formalize";

/**
 * Hook for the AI content improver. Returns improved text directly.
 * Keeps previousValue for undo.
 */
export function useAiImprove(fieldType: string) {
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.ai.improve.useMutation({
    onError: (err) => setError(err.message),
  });

  async function improve(
    text: string,
    action: ImproveAction,
    onChange: (v: string) => void,
  ): Promise<void> {
    if (!text.trim()) return;
    setError(null);
    setPreviousValue(text);
    try {
      const { result } = await mutation.mutateAsync({
        text,
        action,
        fieldType,
      });
      onChange(result);
    } catch {
      // error already set via onError
    }
  }

  function undo(onChange: (v: string) => void): void {
    if (previousValue !== null) {
      onChange(previousValue);
      setPreviousValue(null);
    }
  }

  return {
    improve,
    undo,
    canUndo: previousValue !== null,
    isPending: mutation.isPending,
    error,
  };
}
