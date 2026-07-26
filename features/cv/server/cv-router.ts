import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { cvContentSchema, cvUpdateSchema } from "@/features/cv/schemas/cv";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

/**
 * CV router. All procedures are scoped to the authenticated user and enforce
 * ownership on every read/write.
 */
export const cvRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.cV.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        templateId: true,
        updatedAt: true,
        createdAt: true,
      },
    });
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
          title: input?.title ?? "Untitled CV",
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
      const existing = await ctx.prisma.cV.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
      }

      const updated = await ctx.prisma.cV.update({
        where: { id: input.id },
        data: input.data,
        select: { id: true, updatedAt: true },
      });

      return updated;
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
