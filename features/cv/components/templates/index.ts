import { lazy } from "react";
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
const ExecutiveLazy = lazy(() =>
  import("./executive").then((m) => ({ default: m.ExecutiveTemplate })),
);
const CreativeLazy = lazy(() =>
  import("./creative").then((m) => ({ default: m.CreativeTemplate })),
);
const ElegantLazy = lazy(() =>
  import("./elegant").then((m) => ({ default: m.ElegantTemplate })),
);
const CompactLazy = lazy(() =>
  import("./compact").then((m) => ({ default: m.CompactTemplate })),
);

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Satu kolom, ramah ATS, rapi dan netral.",
    categories: ["ats", "professional", "one-column"],
    lazyComponent: ClassicLazy,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Dua kolom dengan sidebar gelap untuk kontak & keahlian.",
    categories: ["professional", "two-column", "new"],
    lazyComponent: ModernLazy,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Header berwarna dengan aksen, cocok untuk profesional.",
    categories: ["professional", "one-column", "new"],
    lazyComponent: ProfessionalLazy,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Bersih dan lapang, judul di tengah. Ramah ATS.",
    categories: ["ats", "one-column", "professional"],
    lazyComponent: MinimalLazy,
  },
  {
    id: "fresh-graduate",
    name: "Fresh Graduate",
    description: "Menonjolkan pendidikan & keahlian untuk pemula.",
    categories: ["fresh-graduate", "two-column", "new"],
    lazyComponent: FreshGraduateLazy,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Header band elegan dengan foto, formal untuk level senior.",
    categories: ["professional", "one-column", "new"],
    lazyComponent: ExecutiveLazy,
  },
  {
    id: "creative",
    name: "Creative",
    description: "Sidebar bold dengan foto, cocok untuk desainer & kreator.",
    categories: ["creative", "two-column", "new"],
    lazyComponent: CreativeLazy,
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Header terpusat dengan foto bulat, serif premium.",
    categories: ["professional", "one-column", "new"],
    lazyComponent: ElegantLazy,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tata letak padat dua kolom, cocok untuk CV panjang.",
    categories: ["professional", "two-column", "ats"],
    lazyComponent: CompactLazy,
  },
];

export const TEMPLATE_REGISTRY: TemplateRegistry = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as TemplateRegistry,
);

/** Default template id used when a CV references an unknown/missing template. */
export const DEFAULT_TEMPLATE_ID = "classic";

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
