import type { FontId } from "@/features/cv/schemas/cv";
import { FONT_IDS } from "@/features/cv/schemas/cv";

export type FontCategory = "sans" | "serif" | "mono";

export interface FontMeta {
  label: string;
  category: FontCategory;
  cssVar: string;
}

/** Display metadata + CSS var (set in app/layout.tsx) for each preset font. */
export const FONT_REGISTRY: Record<FontId, FontMeta> = {
  geist: { label: "Geist", category: "sans", cssVar: "--font-geist" },
  inter: { label: "Inter", category: "sans", cssVar: "--font-inter" },
  roboto: { label: "Roboto", category: "sans", cssVar: "--font-roboto" },
  lato: { label: "Lato", category: "sans", cssVar: "--font-lato" },
  merriweather: {
    label: "Merriweather",
    category: "serif",
    cssVar: "--font-merriweather",
  },
  lora: { label: "Lora", category: "serif", cssVar: "--font-lora" },
  "source-serif": {
    label: "Source Serif",
    category: "serif",
    cssVar: "--font-source-serif",
  },
  "jetbrains-mono": {
    label: "JetBrains Mono",
    category: "mono",
    cssVar: "--font-jetbrains-mono",
  },
};

export const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  mono: "Monospace",
};

/** Font ids grouped by category, in category order, for the panel selects. */
export const FONTS_BY_CATEGORY: { category: FontCategory; ids: FontId[] }[] = (
  ["sans", "serif", "mono"] as FontCategory[]
).map((category) => ({
  category,
  ids: FONT_IDS.filter((id) => FONT_REGISTRY[id].category === category),
}));
