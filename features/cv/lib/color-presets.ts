import type { CvColors } from "@/features/cv/schemas/cv";

export const PRESETS: Record<string, CvColors> = {
  professional: {
    presetId: "professional",
    background: "#ffffff",
    heading: "#1e3a5f",
    text: "#333333",
    link: "#1e5a8f",
    accent: "#1e3a5f",
  },
  modern: {
    presetId: "modern",
    background: "#ffffff",
    heading: "#0f172a",
    text: "#334155",
    link: "#2563eb",
    accent: "#2563eb",
  },
  colorful: {
    presetId: "colorful",
    background: "#fffdf7",
    heading: "#7c2d12",
    text: "#3f3f46",
    link: "#c2410c",
    accent: "#ea580c",
  },
  dark: {
    presetId: "dark",
    background: "#1a1a1a",
    heading: "#ffffff",
    text: "#e5e5e5",
    link: "#7dd3fc",
    accent: "#38bdf8",
  },
  neutral: {
    presetId: "neutral",
    background: "#ffffff",
    heading: "#171717",
    text: "#404040",
    link: "#525252",
    accent: "#171717",
  },
};
