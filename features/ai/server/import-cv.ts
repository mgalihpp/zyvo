import { type CvContent, cvContentSchema } from "@/features/cv/schemas/cv";

/**
 * Validate the raw JSON string returned by the import model against the CV
 * schema. Pure so it can be unit-tested without the OpenRouter client.
 * Throws on invalid JSON or schema mismatch — the router maps that to a
 * user-facing TRPCError.
 */
export function parseImportedCv(raw: string): Partial<CvContent> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  // Zod strips unknown keys by default, so hallucinated sections are dropped.
  const result = cvContentSchema.partial().safeParse(parsed);
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
