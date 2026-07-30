"use client";

import { useEffect } from "react";
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
import type { CvState } from "@/features/cv/stores/cv-store";
import { useCvStoreApi } from "@/features/cv/stores/cv-store-provider";

type SectionKey = keyof Pick<
  CvState,
  | "experience"
  | "education"
  | "skills"
  | "interpersonal"
  | "languages"
  | "certifications"
  | "organizations"
  | "projects"
  | "custom"
>;

const SECTIONS: SectionKey[] = [
  "experience",
  "education",
  "skills",
  "interpersonal",
  "languages",
  "certifications",
  "organizations",
  "projects",
  "custom",
];

export function useCVAnalyticsTracking() {
  const analytics = useCVAnalytics();
  const storeApi = useCvStoreApi();

  useEffect(() => {
    if (!analytics) return;

    const initial = storeApi.getState();
    const prevSnapshot = new Map<SectionKey, number>(
      SECTIONS.map((s) => [s, initial[s].length]),
    );

    const unsubscribe = storeApi.subscribe((state: CvState) => {
      for (const section of SECTIONS) {
        const prevLen = prevSnapshot.get(section) ?? 0;
        const newLen = state[section].length;

        if (prevLen !== newLen) {
          prevSnapshot.set(section, newLen);
          if (newLen > prevLen) {
            analytics.track("section_added", { section });
          } else {
            analytics.track("section_removed", { section });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [analytics, storeApi]);
}
