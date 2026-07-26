import type { ComponentType, LazyExoticComponent } from "react";
import type { TemplateProps } from "./shared";

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
  { id: "one-column", label: "1 Kolom" },
  { id: "two-column", label: "2 Kolom" },
  { id: "new", label: "Baru" },
];

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  categories: TemplateCategory[];
  /**
   * Eager renderer. Used by the template picker, which renders every template
   * thumbnail at once, so lazy-loading there would add no value.
   */
  component: ComponentType<TemplateProps>;
  /**
   * Lazy renderer for the single active template in the live preview. Only the
   * selected template's chunk is fetched, keeping the preview bundle small.
   */
  lazyComponent: LazyExoticComponent<ComponentType<TemplateProps>>;
}

// Registry is populated in `index.ts` to keep this file free of component
// imports (avoids a circular dependency with `shared`).
export type TemplateRegistry = Record<string, TemplateMeta>;
