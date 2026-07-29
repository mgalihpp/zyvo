import type { CvContent } from "@/features/cv/schemas/cv";

export interface TemplateProps {
  cv: CvContent;
}

/** Formats a start/end date pair, honoring the "current" flag. */
export function formatDateRange(
  start?: string,
  end?: string,
  current?: boolean,
) {
  const from = start?.trim();
  const to = current ? "Sekarang" : end?.trim();
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
}

export function join(parts: (string | undefined)[], sep = "  •  ") {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(sep);
}

/** True when a CV has no meaningful content yet (used for placeholder text). */
export function isEmptyCv(cv: CvContent) {
  return (
    !cv.personal.fullName?.trim() &&
    !cv.summary?.trim() &&
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.skills.length === 0
  );
}
