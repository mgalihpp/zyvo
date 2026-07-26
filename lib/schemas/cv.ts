import { z } from "zod";

/**
 * Zod schemas for the CV builder. Single source of truth shared by the tRPC
 * router (input validation) and react-hook-form (client form validation).
 */

export const personalSchema = z.object({
  fullName: z.string().max(120).optional().default(""),
  headline: z.string().max(160).optional().default(""),
  email: z
    .union([z.literal(""), z.string().email()])
    .optional()
    .default(""),
  phone: z.string().max(40).optional().default(""),
  location: z.string().max(120).optional().default(""),
  website: z.string().max(200).optional().default(""),
  linkedin: z.string().max(200).optional().default(""),
  github: z.string().max(200).optional().default(""),
});

export const experienceSchema = z.object({
  company: z.string().min(1, "Company is required").max(160),
  role: z.string().min(1, "Role is required").max(160),
  location: z.string().max(120).optional().default(""),
  startDate: z.string().max(40).optional().default(""),
  endDate: z.string().max(40).optional().default(""),
  current: z.boolean().optional().default(false),
  description: z.string().max(2000).optional().default(""),
});

export const educationSchema = z.object({
  school: z.string().min(1, "School is required").max(160),
  degree: z.string().max(120).optional().default(""),
  field: z.string().max(120).optional().default(""),
  startDate: z.string().max(40).optional().default(""),
  endDate: z.string().max(40).optional().default(""),
  gpa: z.string().max(20).optional().default(""),
});

/** Proficiency level on a 1–5 scale (1 = expert, 5 = beginner in the UI). */
const levelSchema = z.number().int().min(1).max(5).optional().default(3);

export const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required").max(80),
  level: levelSchema,
});

/** Interpersonal skills are a plain list of names (no proficiency level). */
export const interpersonalSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
});

/** Language proficiency is a free-text level (e.g. "Native", "Fluent"). */
export const languageSchema = z.object({
  name: z.string().min(1, "Language is required").max(80),
  level: z.string().max(60).optional().default(""),
});

export const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required").max(160),
  issuer: z.string().max(160).optional().default(""),
  date: z.string().max(40).optional().default(""),
  url: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
});

export const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(160),
  role: z.string().max(120).optional().default(""),
  date: z.string().max(40).optional().default(""),
  description: z.string().max(2000).optional().default(""),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(160),
  type: z.string().max(120).optional().default(""),
  date: z.string().max(40).optional().default(""),
  skill: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
});

export const customSchema = z.object({
  title: z.string().min(1, "Title is required").max(160),
  description: z.string().max(2000).optional().default(""),
});

/** Full editable CV content (everything except server-managed metadata). */
export const cvContentSchema = z.object({
  title: z.string().min(1, "Title is required").max(160),
  templateId: z.string().max(60).default("classic"),
  personal: personalSchema,
  summary: z.string().max(3000).optional().default(""),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillSchema).default([]),
  interpersonal: z.array(interpersonalSchema).default([]),
  languages: z.array(languageSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  organizations: z.array(organizationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  custom: z.array(customSchema).default([]),
});

/** Partial patch used by autosave (any subset of the content fields). */
export const cvUpdateSchema = cvContentSchema.partial();

export type PersonalInput = z.infer<typeof personalSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type InterpersonalInput = z.infer<typeof interpersonalSchema>;
export type LanguageInput = z.infer<typeof languageSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type OrganizationInput = z.infer<typeof organizationSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type CustomInput = z.infer<typeof customSchema>;
export type CvContent = z.infer<typeof cvContentSchema>;
export type CvUpdate = z.infer<typeof cvUpdateSchema>;

/** Empty defaults for a fresh CV draft. */
export const emptyPersonal: PersonalInput = {
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  github: "",
};

export const emptyExperience: ExperienceInput = {
  company: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
};

export const emptyEducation: EducationInput = {
  school: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  gpa: "",
};

export const emptySkill: SkillInput = { name: "", level: 3 };

export const emptyInterpersonal: InterpersonalInput = { name: "" };

export const emptyLanguage: LanguageInput = { name: "", level: "" };

export const emptyCertification: CertificationInput = {
  name: "",
  issuer: "",
  date: "",
  url: "",
  description: "",
};

export const emptyOrganization: OrganizationInput = {
  name: "",
  role: "",
  date: "",
  description: "",
};

export const emptyProject: ProjectInput = {
  name: "",
  type: "",
  date: "",
  skill: "",
  description: "",
};

export const emptyCustom: CustomInput = { title: "", description: "" };
