import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import type { CvContent } from "@/features/cv/schemas/cv";
import { colorsSchema, typographySchema } from "@/features/cv/schemas/cv";
import type { prisma } from "@/lib/db";

type CvDoc = NonNullable<Awaited<ReturnType<typeof prisma.cV.findUnique>>>;

/** Coerce a possibly-legacy level value (old string / number / null) to 1–5. */
function toLevel(value: unknown): number {
  if (value == null || value === "") return 3;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** Map a Prisma CV document to the builder/preview `CvContent` shape. */
export function toCvContent(cv: CvDoc): CvContent {
  // Fall back to the template's own palette/fonts when a document predates
  // storing colors/typography (e.g. created before the wizard persisted them).
  // Without this a modern-template CV with null colors renders a neutral black
  // sidebar instead of its intended blue.
  const defaultColors = templateDefaultColors(cv.templateId);
  const defaultTypography = templateDefaultTypography(cv.templateId);
  return {
    title: cv.title,
    templateId: cv.templateId,
    typography: typographySchema
      .catch(typographySchema.parse({}))
      .parse(cv.typography ?? defaultTypography),
    colors: colorsSchema
      .catch(colorsSchema.parse({}))
      .parse(cv.colors ?? defaultColors),
    personal: {
      fullName: cv.personal?.fullName ?? "",
      headline: cv.personal?.headline ?? "",
      email: cv.personal?.email ?? "",
      phone: cv.personal?.phone ?? "",
      location: cv.personal?.location ?? "",
      website: cv.personal?.website ?? "",
      linkedin: cv.personal?.linkedin ?? "",
      github: cv.personal?.github ?? "",
      photo: cv.personal?.photo ?? "",
    },
    summary: cv.summary ?? "",
    experience: cv.experience.map((e) => ({
      company: e.company,
      role: e.role,
      location: e.location ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      current: e.current,
      description: e.description ?? "",
    })),
    education: cv.education.map((e) => ({
      school: e.school,
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      gpa: e.gpa ?? "",
    })),
    skills: cv.skills.map((s) => ({ name: s.name, level: toLevel(s.level) })),
    interpersonal: cv.interpersonal.map((i) => ({ name: i.name })),
    languages: cv.languages.map((l) => ({
      name: l.name,
      level: l.level ?? "",
    })),
    certifications: cv.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? "",
      date: c.date ?? "",
      url: c.url ?? "",
      description: c.description ?? "",
    })),
    organizations: cv.organizations.map((o) => ({
      name: o.name,
      role: o.role ?? "",
      date: o.date ?? "",
      description: o.description ?? "",
    })),
    projects: cv.projects.map((p) => ({
      name: p.name,
      type: p.type ?? "",
      date: p.date ?? "",
      skill: p.skill ?? "",
      description: p.description ?? "",
    })),
    custom: cv.custom.map((c) => ({
      title: c.title,
      description: c.description ?? "",
    })),
  };
}
