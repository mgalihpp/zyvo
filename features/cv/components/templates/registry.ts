import type { ComponentType, LazyExoticComponent } from "react";
import type { TemplateProps } from "./shared";

export type { TemplateProps };

/**
 * Template categories used by the picker's filter chips. The literal `id`s map
 * to the Indonesian labels shown in the UI.
 */
export type TemplateCategory =
  | "professional"
  | "ats"
  | "fresh-graduate"
  | "one-column"
  | "two-column"
  | "creative"
  | "new";

export interface TemplateCategoryMeta {
  id: TemplateCategory;
  label: string;
}

/** Ordered list of filter chips (plus an implicit "Semua"/all in the UI). */
export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
  { id: "professional", label: "Profesional" },
  { id: "ats", label: "ATS" },
  { id: "fresh-graduate", label: "Fresh Graduate" },
  { id: "creative", label: "Kreatif" },
  { id: "one-column", label: "1 Kolom" },
  { id: "two-column", label: "2 Kolom" },
  { id: "new", label: "Baru" },
];

/**
 * Metadata pagination per-template untuk CvPaginator. Semua field opsional;
 * default: continuationTop 40, bottom 40, pageBackground kosong (kotak putih
 * pakai --cv-color-bg).
 */
export interface TemplatePagination {
  /** Inset atas konten (px) di halaman 2+. */
  continuationTop?: number;
  /** Ruang bawah (px) yang direservasi algoritma break di tiap halaman. */
  bottom?: number;
  /** Background full-bleed yang dilukis di SETIAP kotak halaman. */
  pageBackground?: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  categories: TemplateCategory[];
  /** Gated behind Basic/Pro. Source of truth: features/cv/lib/premium-templates.ts */
  premium?: boolean;
  /**
   * Lazy renderer for the single active template in the live preview. Only the
   * selected template's chunk is fetched, keeping the preview bundle small.
   *
   * The eager renderers (used by the all-at-once thumbnail grids) live in
   * `eager.ts` so importing this registry never pulls all five templates into
   * the builder's initial chunk.
   */
  lazyComponent: LazyExoticComponent<ComponentType<TemplateProps>>;
  /** Metadata pagination (lihat TemplatePagination). */
  pagination?: TemplatePagination;
}

// Registry is populated in `index.ts` to keep this file free of component
// imports (avoids a circular dependency with `shared`).
export type TemplateRegistry = Record<string, TemplateMeta>;
