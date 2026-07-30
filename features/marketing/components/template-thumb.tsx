"use client";

import { memo } from "react";
import type { TemplateMeta } from "@/features/cv/components/templates";
import { getEagerTemplate } from "@/features/cv/components/templates/eager";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cvRootStyle } from "@/features/cv/lib/cv-style";

/**
 * A4-aspect thumbnail that renders a real CV template with sample data, scaled
 * down. Reuses the actual template renderers (not mock art) so the marketing
 * previews always match what users actually get in the builder.
 */
export const MarketingTemplateThumb = memo(function MarketingTemplateThumb({
  template,
  scale = 0.34,
}: {
  template: TemplateMeta;
  scale?: number;
}) {
  const Template = getEagerTemplate(template.id);
  const sample = {
    ...SAMPLE_CV,
    colors: templateDefaultColors(template.id),
    typography: templateDefaultTypography(template.id),
  };
  return (
    <div
      className="pointer-events-none relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: "1 / 1.414" }}
      aria-hidden
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: 794,
          transform: `scale(${scale})`,
          ...cvRootStyle(sample),
        }}
      >
        <Template cv={sample} />
      </div>
    </div>
  );
});
