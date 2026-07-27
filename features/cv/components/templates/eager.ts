import type { ComponentType } from "react";
import { ClassicTemplate } from "./classic";
import { FreshGraduateTemplate } from "./fresh-graduate";
import { DEFAULT_TEMPLATE_ID } from "./index";
import { MinimalTemplate } from "./minimal";
import { ModernTemplate } from "./modern";
import { ProfessionalTemplate } from "./professional";
import type { TemplateProps } from "./registry";

/**
 * Eager template renderers, keyed by id. Used only by the thumbnail grids that
 * render every template at once (dashboard cards/gallery, builder template
 * picker), so lazy-loading there adds no value. Kept out of `index.ts` so the
 * live preview — the builder's critical path — never pulls all five templates
 * into its initial chunk.
 */
const EAGER_TEMPLATES: Record<string, ComponentType<TemplateProps>> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  professional: ProfessionalTemplate,
  minimal: MinimalTemplate,
  "fresh-graduate": FreshGraduateTemplate,
};

/** Returns the eager renderer for `id`, falling back to the default template. */
export function getEagerTemplate(
  id: string | undefined,
): ComponentType<TemplateProps> {
  return (
    (id ? EAGER_TEMPLATES[id] : undefined) ??
    EAGER_TEMPLATES[DEFAULT_TEMPLATE_ID]
  );
}
