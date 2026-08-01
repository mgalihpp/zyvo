"use client";

import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import type { CvContent } from "@/features/cv/schemas/cv";
import { trpc } from "@/lib/trpc/client";

/** Fetch a CV by id and serialize it for AI prompts. No cv-store needed. */
export function useCvSnapshot(cvId: string | undefined) {
  const { data: cv, isLoading } = trpc.cv.getById.useQuery(
    { id: cvId ?? "" },
    { enabled: Boolean(cvId), staleTime: 60_000 },
  );

  const snapshot = cv ? buildSnapshot(cv as unknown as CvContent) : undefined;

  return { snapshot, isLoading: Boolean(cvId) && isLoading };
}
