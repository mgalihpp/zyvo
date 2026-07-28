import type { CSSProperties } from "react";
import { readableOn } from "@/features/cv/lib/contrast";
import { FONT_REGISTRY } from "@/features/cv/lib/fonts";
import type { CvContent } from "@/features/cv/schemas/cv";
import { emptyColors, emptyTypography } from "@/features/cv/schemas/cv";

/** CSS-var + font/spacing style applied to the CV template wrapper. Shared by
 *  the live preview and the print route so they can never drift. Older CVs may
 *  lack typography/colors (optional embedded docs), so fall back to defaults. */
export function cvRootStyle(
  content: Pick<CvContent, "typography" | "colors">,
): CSSProperties {
  const typography = content.typography ?? emptyTypography;
  const colors = content.colors ?? emptyColors;
  return {
    "--cv-font-heading": `var(${FONT_REGISTRY[typography.fontHeading].cssVar})`,
    "--cv-font-body": `var(${FONT_REGISTRY[typography.fontBody].cssVar})`,
    fontFamily: "var(--cv-font-body)",
    fontSize: `${13 * typography.scale}px`,
    lineHeight: typography.lineHeight,
    letterSpacing: `${typography.letterSpacing}em`,
    "--cv-color-bg": colors.background,
    "--cv-color-heading": colors.heading,
    "--cv-color-text": colors.text,
    "--cv-color-link": colors.link,
    "--cv-color-accent": colors.accent,
    "--cv-color-on-accent": readableOn(colors.accent),
  } as CSSProperties;
}
