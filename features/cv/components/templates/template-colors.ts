import type { CvColors, Typography } from "@/features/cv/schemas/cv";
import { emptyTypography } from "@/features/cv/schemas/cv";

/**
 * Default color palette per template. Selecting a template applies its palette
 * (see the store's `setTemplateId`); the user can still override any color via
 * the colors panel afterwards. Each template ships a distinct look so the
 * picker thumbnails and initial preview reflect the template's intended style.
 */
export const TEMPLATE_DEFAULT_COLORS: Record<string, CvColors> = {
  classic: {
    presetId: "neutral",
    background: "#ffffff",
    heading: "#171717",
    text: "#404040",
    link: "#525252",
    accent: "#171717",
  },
  modern: {
    presetId: "modern",
    background: "#ffffff",
    heading: "#0f172a",
    text: "#334155",
    link: "#2563eb",
    accent: "#2563eb",
  },
  professional: {
    presetId: "professional",
    background: "#ffffff",
    heading: "#1e3a5f",
    text: "#333333",
    link: "#1e5a8f",
    accent: "#1e3a5f",
  },
  minimal: {
    presetId: "custom",
    background: "#ffffff",
    heading: "#0f766e",
    text: "#3f3f46",
    link: "#0d9488",
    accent: "#14b8a6",
  },
  "fresh-graduate": {
    presetId: "colorful",
    background: "#fffdf7",
    heading: "#7c2d12",
    text: "#3f3f46",
    link: "#c2410c",
    accent: "#ea580c",
  },
};

/** Default palette for a template id, falling back to the classic (neutral). */
export function templateDefaultColors(id: string): CvColors {
  return {
    ...(TEMPLATE_DEFAULT_COLORS[id] ?? TEMPLATE_DEFAULT_COLORS.classic),
  };
}

/**
 * Default fonts per template. Only overrides differ from the base geist/geist
 * (see `emptyTypography`); scale/lineHeight/letterSpacing stay at defaults so
 * the user can still tune them. Selecting a template applies these fonts.
 */
const TEMPLATE_DEFAULT_FONTS: Record<
  string,
  Pick<Typography, "fontHeading" | "fontBody">
> = {
  classic: { fontHeading: "merriweather", fontBody: "lora" },
  modern: { fontHeading: "inter", fontBody: "inter" },
  professional: { fontHeading: "source-serif", fontBody: "source-serif" },
  minimal: { fontHeading: "geist", fontBody: "geist" },
  "fresh-graduate": { fontHeading: "lato", fontBody: "lato" },
};

/** Default typography for a template id, falling back to base defaults. */
export function templateDefaultTypography(id: string): Typography {
  return {
    ...emptyTypography,
    ...(TEMPLATE_DEFAULT_FONTS[id] ?? {}),
  };
}
