import { z } from "zod";

export const columnKindSchema = z.enum([
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "custom",
]);
export type ColumnKind = z.infer<typeof columnKindSchema>;

export const columnColorSchema = z.enum([
  "blue",
  "green",
  "yellow",
  "purple",
  "red",
  "orange",
  "pink",
  "gray",
]);
export type ColumnColor = z.infer<typeof columnColorSchema>;

export const boardColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  kind: columnKindSchema,
  order: z.number().int().min(0),
  // nullish: Prisma returns `null` for docs saved before the field existed.
  color: columnColorSchema.nullish(),
});
export type BoardColumn = z.infer<typeof boardColumnSchema>;

export const workTypeSchema = z.enum(["remote", "hybrid", "onsite"]);

export const applicationInputSchema = z.object({
  company: z.string().min(1, "Nama perusahaan wajib diisi").max(160),
  position: z.string().min(1, "Posisi wajib diisi").max(160),
  jobUrl: z.url("URL tidak valid").max(2000).optional().or(z.literal("")),
  location: z.string().max(160).optional(),
  workType: workTypeSchema.optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  cvId: z.string().optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
  appliedAt: z.coerce.date().optional(),
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const applicationUpdateSchema = z.object({
  id: z.string(),
  data: applicationInputSchema.partial(),
});

export const moveApplicationSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  order: z.number().int().min(0),
});

export const updateColumnsSchema = z.object({
  columns: z.array(boardColumnSchema).min(1).max(20),
});

export const addNoteSchema = z.object({
  id: z.string(),
  note: z.string().min(1).max(2000),
});
