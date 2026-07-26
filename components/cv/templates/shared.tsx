import type { CvContent } from "@/lib/schemas/cv";

/** Props every CV template component receives. */
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
  const to = current ? "Present" : end?.trim();
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
}

/** Joins truthy, trimmed parts with a separator. */
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
