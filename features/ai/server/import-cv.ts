import type { z } from "zod";
import {
  type CvContent,
  certificationSchema,
  customSchema,
  cvCreateSchema,
  educationSchema,
  experienceSchema,
  interpersonalSchema,
  languageSchema,
  organizationSchema,
  projectSchema,
  skillSchema,
} from "@/features/cv/schemas/cv";

const ARRAY_SECTIONS: Record<string, z.ZodTypeAny> = {
  experience: experienceSchema,
  education: educationSchema,
  skills: skillSchema,
  interpersonal: interpersonalSchema,
  languages: languageSchema,
  certifications: certificationSchema,
  organizations: organizationSchema,
  projects: projectSchema,
  custom: customSchema,
};

const MAX_LEVEL = 5;

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      if (key === "current") {
        out.current = v === true || v === "true" || v === 1 || v === "1";
        continue;
      }
      if (
        key === "email" &&
        typeof v === "string" &&
        v !== "" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ) {
        out.email = "";
        continue;
      }
      if (typeof v === "object") {
        out[key] = sanitize(v);
      } else if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        out[key] = v;
      }
    }
    return out;
  }
  return value;
}

/** Skill levels are numeric 1–5; the model often returns strings or bad numbers. */
function normalizeSkillLevels(items: unknown): unknown[] {
  if (!Array.isArray(items)) return items as unknown[];
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const obj = { ...(item as Record<string, unknown>) };
    if (obj.level != null) {
      const n = typeof obj.level === "number" ? obj.level : Number(obj.level);
      obj.level = Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL ? n : 3;
    }
    return obj;
  });
}

function keepValidItems(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...data };
  for (const [section, itemSchema] of Object.entries(ARRAY_SECTIONS)) {
    const items = out[section];
    if (!Array.isArray(items)) continue;
    const cleaned = section === "skills" ? normalizeSkillLevels(items) : items;
    out[section] = cleaned.filter((item) => itemSchema.safeParse(item).success);
  }
  return out;
}

/**
 * Validate the raw JSON string returned by the import model against the CV
 * schema. Pure so it can be unit-tested without the OpenRouter client.
 *
 * LLM output is messy: nulls, string skill levels, string booleans, and
 * partial array items are common. Sanitize those shapes and drop invalid
 * array items before validating, so one malformed section does not fail the
 * whole import.
 *
 * Throws on invalid JSON or when the top-level shape still doesn't match —
 * the router maps that to a user-facing TRPCError.
 */
export function parseImportedCv(raw: string): Partial<CvContent> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const cleaned = keepValidItems(sanitize(parsed) as Record<string, unknown>);
  // Zod strips unknown keys by default, so hallucinated sections are dropped.
  const result = cvCreateSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error("Schema mismatch");
  }
  const fullName =
    typeof result.data.personal?.fullName === "string"
      ? result.data.personal.fullName.trim()
      : "";
  return {
    ...result.data,
    title: fullName ? `CV ${fullName}` : "CV Hasil Import",
  };
}
