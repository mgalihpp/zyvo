import type { CV, Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assertCvSlot,
  assertFeature,
} from "@/features/billing/server/entitlements";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { toCvContent } from "@/features/cv/lib/cv-content";
import { isPremiumTemplate } from "@/features/cv/lib/premium-templates";
import {
  cvCreateSchema,
  cvUpdateSchema,
  DEFAULT_SECTION_ORDER,
  emptyPersonal,
} from "@/features/cv/schemas/cv";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 30;

/** CV content fields that version diffs are computed over, with UI labels. */
const DIFF_FIELDS = [
  ["title", "Judul"],
  ["templateId", "Template"],
  ["typography", "Tipografi"],
  ["colors", "Warna"],
  ["personal", "Informasi Pribadi"],
  ["summary", "Ringkasan"],
  ["experience", "Pengalaman"],
  ["education", "Pendidikan"],
  ["skills", "Keahlian"],
  ["interpersonal", "Interpersonal"],
  ["languages", "Bahasa"],
  ["certifications", "Sertifikasi"],
  ["organizations", "Organisasi"],
  ["projects", "Proyek"],
  ["custom", "Bagian Kustom"],
] as const;

/** Human labels for subfields of the `personal` object. */
const PERSONAL_LABELS: Record<string, string> = {
  fullName: "Nama",
  headline: "Headline",
  email: "Email",
  phone: "Telepon",
  location: "Lokasi",
  website: "Website",
  linkedin: "LinkedIn",
  github: "GitHub",
  photo: "Foto",
};

/** One diff line inside a section: restore = add back, remove, edit, info. */
export interface VersionChangeEntry {
  kind: "restore" | "remove" | "edit" | "info";
  text: string;
}

/** One changed section sent to the history panel, with per-item diff lines. */
export interface VersionChange {
  label: string;
  /** Pseudo file name shown in the diff header, e.g. "pengalaman.cv". */
  file: string;
  entries: VersionChangeEntry[];
}

/** "Pengalaman" → "pengalaman.cv" for the diff-style section header. */
function fileNameOf(label: string): string {
  return `${label.toLowerCase().replace(/\s+/g, "-")}.cv`;
}

const eq = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Display name of a section list item (company, school, skill name, …). */
function itemName(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const name = o.company ?? o.school ?? o.name ?? o.title;
  return typeof name === "string" && name.trim() ? name : null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

/**
 * Multi-line rendering of a list item for the diff view: a title line
 * ("Frontend Developer, PT Kreasi Digital") followed by description lines and
 * a date range, mirroring how the item reads on the CV itself.
 */
function itemLines(item: unknown): string[] {
  if (!item || typeof item !== "object") return [];
  const o = item as Record<string, unknown>;

  const name = itemName(item) ?? "";
  const role = str(o.role) || str(o.degree) || str(o.issuer) || str(o.type);
  const title = role && name ? `${role}, ${name}` : name || role;

  const lines: string[] = title ? [title] : [];

  const description = str(o.description);
  if (description) {
    for (const line of description.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  const start = str(o.startDate);
  const end = o.current === true ? "Sekarang" : str(o.endDate);
  const date = str(o.date) || [start, end].filter(Boolean).join(" - ");
  if (date) lines.push(date);

  const level = str(o.level as unknown) || str(o.gpa);
  if (level) lines.push(level);

  return lines;
}

/** Expands one list item into diff entries of the given kind. */
function itemEntries(
  kind: VersionChangeEntry["kind"],
  item: unknown,
): VersionChangeEntry[] {
  return itemLines(item).map((text) => ({ kind, text }));
}

/**
 * Diff lines describing what restoring `version` would change relative to
 * `current`. For list sections each line names the item that would be added
 * back / removed / edited.
 */
function describeChange(
  key: (typeof DIFF_FIELDS)[number][0],
  version: unknown,
  current: unknown,
): VersionChangeEntry[] {
  // Short scalar values: show the actual before → after.
  if (key === "title" || key === "templateId") {
    return [
      { kind: "remove", text: `${current ?? "—"}` },
      { kind: "restore", text: `${version ?? "—"}` },
    ];
  }

  if (key === "summary") {
    if (!current && version)
      return [{ kind: "restore", text: "Ringkasan akan dikembalikan" }];
    if (current && !version)
      return [{ kind: "remove", text: "Ringkasan akan dikosongkan" }];
    return [{ kind: "edit", text: "Isi ringkasan berbeda" }];
  }

  if (key === "personal") {
    const a = (current ?? {}) as Record<string, unknown>;
    const b = (version ?? {}) as Record<string, unknown>;
    const entries: VersionChangeEntry[] = [];
    for (const k of Object.keys(PERSONAL_LABELS)) {
      if (eq(a[k], b[k])) continue;
      const label = PERSONAL_LABELS[k];
      const curVal = str(a[k]);
      const verVal = str(b[k]);
      // Photos are data URLs / long blobs — describe the change instead of
      // dumping the value.
      if (k === "photo") {
        if (!curVal && verVal)
          entries.push({ kind: "restore", text: "Foto: akan dikembalikan" });
        else if (curVal && !verVal)
          entries.push({ kind: "remove", text: "Foto: akan dihapus" });
        else entries.push({ kind: "edit", text: "Foto: diganti" });
        continue;
      }
      if (!curVal && verVal) {
        entries.push({ kind: "restore", text: `${label}: ${verVal}` });
      } else if (curVal && !verVal) {
        entries.push({ kind: "remove", text: `${label}: ${curVal}` });
      } else {
        entries.push({ kind: "remove", text: `${label}: ${curVal}` });
        entries.push({ kind: "restore", text: `${label}: ${verVal}` });
      }
    }
    if (entries.length === 0)
      return [{ kind: "edit", text: "Data pribadi berbeda" }];
    return entries;
  }

  if (key === "typography" || key === "colors") {
    const a = (current ?? {}) as Record<string, unknown>;
    const b = (version ?? {}) as Record<string, unknown>;
    const n = new Set([...Object.keys(a), ...Object.keys(b)]);
    const count = [...n].filter((k) => !eq(a[k], b[k])).length;
    return [{ kind: "edit", text: `${count} pengaturan berbeda` }];
  }

  // List sections: full item lines for what gets added back, removed, edited.
  const cur = Array.isArray(current) ? current : [];
  const ver = Array.isArray(version) ? version : [];

  const curNames = cur.map(itemName);
  const verNames = ver.map(itemName);

  const entries: VersionChangeEntry[] = [];

  for (let i = 0; i < ver.length; i++) {
    const n = verNames[i];
    if (n !== null && !curNames.includes(n)) {
      entries.push(...itemEntries("restore", ver[i]));
    }
  }
  for (let i = 0; i < cur.length; i++) {
    const n = curNames[i];
    if (n !== null && !verNames.includes(n)) {
      entries.push(...itemEntries("remove", cur[i]));
    }
  }
  // Same-name items whose content differs: show the version's lines as edits.
  for (let i = 0; i < ver.length; i++) {
    const n = verNames[i];
    if (
      n !== null &&
      curNames.includes(n) &&
      !eq(ver[i], cur[curNames.indexOf(n)])
    ) {
      entries.push(...itemEntries("edit", ver[i]));
    }
  }

  if (entries.length === 0) {
    // Unnamed items or pure reorder — fall back to counts.
    return [
      {
        kind: "info",
        text:
          cur.length === ver.length
            ? "Urutan atau isi item berbeda"
            : `${cur.length} item → ${ver.length} item`,
      },
    ];
  }
  return entries;
}

/**
 * Human-readable list of what restoring `version` would change, compared to
 * `current`. Deep-compares via JSON since both sides come from Prisma rows
 * with stable key order.
 */
function diffChanges(
  version: Record<string, unknown>,
  current: Record<string, unknown>,
): VersionChange[] {
  return DIFF_FIELDS.filter(([key]) => !eq(version[key], current[key])).map(
    ([key, label]) => ({
      label,
      file: fileNameOf(label),
      entries: describeChange(key, version[key], current[key]),
    }),
  );
}

/** Strips identity/timestamp fields from a CV row, leaving only content. */
function cvContentOf(cv: CV): Record<string, unknown> {
  const {
    id: _id,
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...content
  } = cv;
  return content;
}

/**
 * Persists a full-content snapshot of a CV row and trims history to the
 * newest MAX_VERSIONS. Content is stored as a plain JSON blob — versions are
 * read-only and only ever restored wholesale, so no composite types needed.
 */
async function snapshotCv(prisma: PrismaClient, cv: CV): Promise<void> {
  await prisma.cvVersion.create({
    data: {
      cvId: cv.id,
      userId: cv.userId,
      content: cvContentOf(cv) as Prisma.InputJsonValue,
    },
  });

  const stale = await prisma.cvVersion.findMany({
    where: { cvId: cv.id },
    orderBy: { createdAt: "desc" },
    skip: MAX_VERSIONS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.cvVersion.deleteMany({
      where: { id: { in: stale.map((v) => v.id) } },
    });
  }
}

/**
 * CV router. All procedures are scoped to the authenticated user and enforce
 * ownership on every read/write.
 */
export const cvRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Content sections are included so the dashboard can render a live preview
    // thumbnail per card without a second round-trip.
    const rows = await ctx.prisma.cV.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        templateId: true,
        updatedAt: true,
        createdAt: true,
        colors: true,
        typography: true,
        personal: true,
        summary: true,
        experience: true,
        education: true,
        skills: true,
        interpersonal: true,
        languages: true,
        certifications: true,
        organizations: true,
        projects: true,
        custom: true,
        sectionOrder: true,
      },
    });
    // Normalize legacy documents where `personal` was not yet stored (null)
    // or `colors`/`typography` predate the wizard persisting them. React
    // Compiler trusts TypeScript types and removes optional chaining in
    // template renders, so nulls crash or render wrong defaults at runtime.
    return rows.map((cv) => ({
      ...cv,
      personal: cv.personal ?? { ...emptyPersonal },
      colors: cv.colors ?? templateDefaultColors(cv.templateId),
      typography: cv.typography ?? templateDefaultTypography(cv.templateId),
      sectionOrder: cv.sectionOrder ?? DEFAULT_SECTION_ORDER,
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cv = await ctx.prisma.cV.findUnique({ where: { id: input.id } });

      if (!cv || cv.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      return { ...cv, sectionOrder: cv.sectionOrder ?? DEFAULT_SECTION_ORDER };
    }),

  create: protectedProcedure
    .input(cvCreateSchema.optional())
    .mutation(async ({ ctx, input }) => {
      await assertCvSlot(ctx);
      if (isPremiumTemplate(input?.templateId)) {
        await assertFeature(ctx, "premiumTemplates");
      }
      const templateId = input?.templateId ?? "classic";
      const cv = await ctx.prisma.cV.create({
        data: {
          userId: ctx.session.user.id,
          title: input?.title ?? "CV Tanpa Judul",
          templateId,
          // Persist the template's default palette/fonts at creation so the
          // builder preview matches the template picker thumbnail. Without
          // this, a fresh CV stores null colors and falls back to the neutral
          // black default in the editor. Explicit input (e.g. AI/import) wins.
          colors: input?.colors ?? templateDefaultColors(templateId),
          typography:
            input?.typography ?? templateDefaultTypography(templateId),
          personal: input?.personal,
          summary: input?.summary,
          experience: input?.experience ?? [],
          education: input?.education ?? [],
          skills: input?.skills ?? [],
          interpersonal: input?.interpersonal ?? [],
          languages: input?.languages ?? [],
          certifications: input?.certifications ?? [],
          organizations: input?.organizations ?? [],
          projects: input?.projects ?? [],
          custom: input?.custom ?? [],
          sectionOrder: input?.sectionOrder ?? DEFAULT_SECTION_ORDER,
        },
        select: { id: true },
      });

      return cv;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: cvUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      // Full row (not just userId): the pre-update content is what gets
      // snapshotted when the 10-minute window has elapsed.
      const existing = await ctx.prisma.cV.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      // Only *changing to* a premium template is gated — a downgraded user
      // whose CV already uses one can keep saving content edits.
      if (
        input.data.templateId &&
        input.data.templateId !== existing.templateId &&
        isPremiumTemplate(input.data.templateId)
      ) {
        await assertFeature(ctx, "premiumTemplates");
      }

      // Best-effort snapshot of the pre-update state, at most once per
      // SNAPSHOT_INTERVAL_MS. Never blocks the save itself.
      try {
        const latest = await ctx.prisma.cvVersion.findFirst({
          where: { cvId: input.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (
          !latest ||
          Date.now() - latest.createdAt.getTime() > SNAPSHOT_INTERVAL_MS
        ) {
          await snapshotCv(ctx.prisma, existing);
        }
      } catch (err) {
        console.error("cv version snapshot failed", err);
      }

      const updated = await ctx.prisma.cV.update({
        where: { id: input.id },
        data: input.data,
        select: { id: true, updatedAt: true },
      });

      return updated;
    }),

  /**
   * Deep-copy a CV. Embedded section arrays are plain JSON on the Mongo doc, so
   * a spread copies them wholesale — no per-field mapping needed.
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertCvSlot(ctx);
      const src = await ctx.prisma.cV.findUnique({ where: { id: input.id } });

      if (!src || src.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      // Drop identity/timestamp fields; carry over the rest.
      const {
        id: _id,
        userId: _userId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...content
      } = src;

      const copy = await ctx.prisma.cV.create({
        data: {
          ...content,
          userId: ctx.session.user.id,
          title: `${src.title} (Salinan)`,
        },
        select: { id: true },
      });

      return copy;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.cV.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      await ctx.prisma.cV.delete({ where: { id: input.id } });

      return { id: input.id };
    }),

  listVersions: protectedProcedure
    .input(z.object({ cvId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cv = await ctx.prisma.cV.findUnique({
        where: { id: input.cvId },
      });
      if (!cv || cv.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      const versions = await ctx.prisma.cvVersion.findMany({
        where: { cvId: input.cvId },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, content: true },
      });

      // Content itself stays server-side (full CV blobs would bloat the
      // payload); each version instead carries a human-readable list of what
      // restoring it would change relative to the CURRENT CV.
      const current = cvContentOf(cv);
      return versions.map((v) => ({
        id: v.id,
        createdAt: v.createdAt,
        changes: diffChanges(v.content as Record<string, unknown>, current),
      }));
    }),

  /**
   * Full content of one version, for previewing it in the live CV editor
   * without persisting anything.
   */
  getVersion: protectedProcedure
    .input(z.object({ cvId: z.string(), versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cv = await ctx.prisma.cV.findUnique({
        where: { id: input.cvId },
        select: { userId: true },
      });
      if (!cv || cv.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      const version = await ctx.prisma.cvVersion.findUnique({
        where: { id: input.versionId },
      });
      if (!version || version.cvId !== input.cvId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versi tidak ditemukan",
        });
      }

      // Normalize the raw stored blob (versions can predate `personal` being
      // non-null) into CvContent so the preview cast in history-panel is safe.
      return {
        id: version.id,
        content: toCvContent(version.content as unknown as CV),
      };
    }),

  restoreVersion: protectedProcedure
    .input(z.object({ cvId: z.string(), versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cv = await ctx.prisma.cV.findUnique({ where: { id: input.cvId } });
      if (!cv || cv.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      const version = await ctx.prisma.cvVersion.findUnique({
        where: { id: input.versionId },
      });
      if (!version || version.cvId !== input.cvId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versi tidak ditemukan",
        });
      }

      // Restore never loses data: the current state becomes a new version
      // first (unconditionally — bypasses the 10-minute window on purpose).
      await snapshotCv(ctx.prisma, cv);

      // Normalize before writing so a null-personal version can't reintroduce
      // the null crash in the editor preview.
      const content = toCvContent(
        version.content as unknown as CV,
      ) as unknown as Prisma.CVUpdateInput;
      return ctx.prisma.cV.update({
        where: { id: input.cvId },
        data: content,
      });
    }),
});
