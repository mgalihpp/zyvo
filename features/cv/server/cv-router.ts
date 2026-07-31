import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cvContentSchema,
  cvUpdateSchema,
  emptyPersonal,
} from "@/features/cv/schemas/cv";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import type { CV, PrismaClient } from "@prisma/client";

const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 30;

/**
 * Persists a full-content snapshot of a CV row and trims history to the
 * newest MAX_VERSIONS. Content is stored as a plain JSON blob — versions are
 * read-only and only ever restored wholesale, so no composite types needed.
 */
async function snapshotCv(prisma: PrismaClient, cv: CV): Promise<void> {
  const {
    id: _id,
    userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...content
  } = cv;

  await prisma.cvVersion.create({
    data: { cvId: cv.id, userId, content },
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
      },
    });
    // Normalize legacy documents where `personal` was not yet stored (null).
    // React Compiler trusts TypeScript types and removes optional chaining in
    // template renders, so a null personal crashes at runtime.
    return rows.map((cv) =>
      cv.personal ? cv : { ...cv, personal: { ...emptyPersonal } },
    );
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cv = await ctx.prisma.cV.findUnique({ where: { id: input.id } });

      if (!cv || cv.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      return cv;
    }),

  create: protectedProcedure
    .input(cvContentSchema.partial().optional())
    .mutation(async ({ ctx, input }) => {
      const cv = await ctx.prisma.cV.create({
        data: {
          userId: ctx.session.user.id,
          title: input?.title ?? "CV Tanpa Judul",
          templateId: input?.templateId ?? "classic",
          personal: input?.personal,
          summary: input?.summary,
          experience: input?.experience ?? [],
          education: input?.education ?? [],
          skills: input?.skills ?? [],
          projects: input?.projects ?? [],
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
});
