"use client";

import { useState } from "react";
import { toBulletHtml } from "@/features/ai/lib/bullets";
import { trpc } from "@/lib/trpc/client";

export type ImproveAction =
  | "improve"
  | "shorten"
  | "expand"
  | "formalize"
  | "bulletify";

/**
 * Hook for the AI content improver. Returns improved text directly.
 * Keeps previousValue for undo.
 */
export function useAiImprove(
  fieldType: string,
  onError?: (err: unknown) => void,
) {
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const utils = trpc.useUtils();
  const mutation = trpc.ai.improve.useMutation({
    onError: (err) => {
      setError(err.message);
      setForbidden(err.data?.code === "FORBIDDEN");
      onError?.(err);
    },
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });

  async function improve(
    text: string,
    action: ImproveAction,
    onChange: (v: string) => void,
  ): Promise<void> {
    if (!text.trim()) return;
    setError(null);
    setForbidden(false);
    setPreviousValue(text);
    try {
      const { result } = await mutation.mutateAsync({
        text,
        action,
        fieldType,
      });
      onChange(action === "bulletify" ? toBulletHtml(result) : result);
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
    forbidden,
  };
}
