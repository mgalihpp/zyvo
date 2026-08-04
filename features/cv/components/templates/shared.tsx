import type { CSSProperties, ReactNode } from "react";
import type { CvContent, MainSectionId } from "@/features/cv/schemas/cv";
import { DEFAULT_SECTION_ORDER } from "@/features/cv/schemas/cv";

export interface TemplateProps {
  cv: CvContent;
}

/**
 * Kelas A4 standar yang dipakai SEMUA template. Ukuran halaman (794x1123px,
 * = 210x297mm @96dpi), bg, dan setting print konsisten agar preview dan PDF
 * tidak pernah melenceng antar template.
 */
const CV_PAGE_CLASS =
  "mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]";

/**
 * A4 page wrapper. KONVENSI template baru: root template WAJIB
 * <CvPage className="...">, dan setiap wrapper item (pengalaman/proyek/sertif/
 * organisasi/custom) WAJIB diberi `data-entry`. Dengan begitu pagination PDF,
 * aturan break, dan garis batas halaman di preview otomatis bekerja.
 */
export function CvPage({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <article
      className={className ? `${CV_PAGE_CLASS} ${className}` : CV_PAGE_CLASS}
      style={style}
    >
      {children}
    </article>
  );
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

const VALID_MAIN: ReadonlySet<string> = new Set(DEFAULT_SECTION_ORDER);

function hasSectionContent(cv: CvContent, id: MainSectionId): boolean {
  switch (id) {
    case "summary":
      return Boolean(cv.summary?.trim());
    case "experience":
      return cv.experience.length > 0;
    case "education":
      return cv.education.length > 0;
    case "projects":
      return cv.projects.length > 0;
    case "organizations":
      return cv.organizations.length > 0;
    case "custom":
      return cv.custom.length > 0;
  }
}

/** Main section ids in user order, filtered to those with content. Falls back
 *  to DEFAULT_SECTION_ORDER when the stored order is missing, empty, or
 *  contains unknown/duplicate ids. */
export function orderedMainSections(cv: CvContent): MainSectionId[] {
  const order =
    cv.sectionOrder && cv.sectionOrder.length > 0
      ? cv.sectionOrder
      : DEFAULT_SECTION_ORDER;
  const seen = new Set<MainSectionId>();
  for (const id of order) {
    if (!VALID_MAIN.has(id) || seen.has(id as MainSectionId)) continue;
    const section = id as MainSectionId;
    if (hasSectionContent(cv, section)) seen.add(section);
  }
  return [...seen];
}
