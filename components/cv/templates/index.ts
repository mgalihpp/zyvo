import { lazy } from "react";
import { ClassicTemplate } from "./classic";
import { FreshGraduateTemplate } from "./fresh-graduate";
import { MinimalTemplate } from "./minimal";
import { ModernTemplate } from "./modern";
import { ProfessionalTemplate } from "./professional";
import type { TemplateMeta, TemplateRegistry } from "./registry";

// Lazy renderers used by the live preview (one active template at a time).
const ClassicLazy = lazy(() =>
  import("./classic").then((m) => ({ default: m.ClassicTemplate })),
);
const ModernLazy = lazy(() =>
  import("./modern").then((m) => ({ default: m.ModernTemplate })),
);
const ProfessionalLazy = lazy(() =>
  import("./professional").then((m) => ({ default: m.ProfessionalTemplate })),
);
const MinimalLazy = lazy(() =>
  import("./minimal").then((m) => ({ default: m.MinimalTemplate })),
);
const FreshGraduateLazy = lazy(() =>
  import("./fresh-graduate").then((m) => ({
    default: m.FreshGraduateTemplate,
  })),
);

/** All templates, in picker display order. */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Satu kolom, ramah ATS, rapi dan netral.",
    categories: ["ats", "professional", "one-column"],
    component: ClassicTemplate,
    lazyComponent: ClassicLazy,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Dua kolom dengan sidebar gelap untuk kontak & keahlian.",
    categories: ["professional", "two-column", "new"],
    component: ModernTemplate,
    lazyComponent: ModernLazy,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Header berwarna dengan aksen, cocok untuk profesional.",
    categories: ["professional", "one-column", "new"],
    component: ProfessionalTemplate,
    lazyComponent: ProfessionalLazy,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Bersih dan lapang, judul di tengah. Ramah ATS.",
    categories: ["ats", "one-column", "professional"],
    component: MinimalTemplate,
    lazyComponent: MinimalLazy,
  },
  {
    id: "fresh-graduate",
    name: "Fresh Graduate",
    description: "Menonjolkan pendidikan & keahlian untuk pemula.",
    categories: ["fresh-graduate", "two-column", "new"],
    component: FreshGraduateTemplate,
    lazyComponent: FreshGraduateLazy,
  },
];

/** id -> template lookup. */
export const TEMPLATE_REGISTRY: TemplateRegistry = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as TemplateRegistry,
);

/** Default template id used when a CV references an unknown/missing template. */
export const DEFAULT_TEMPLATE_ID = "classic";

/** Resolves a template by id, falling back to the default. */
export function getTemplate(id: string | undefined): TemplateMeta {
  return (
    (id ? TEMPLATE_REGISTRY[id] : undefined) ??
    TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID]
  );
}

export type {
  TemplateCategory,
  TemplateMeta,
} from "./registry";
export { TEMPLATE_CATEGORIES } from "./registry";
