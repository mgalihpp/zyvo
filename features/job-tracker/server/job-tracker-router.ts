import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { openrouter } from "@/features/ai/lib/openrouter";
import { checkRateLimit } from "@/features/ai/lib/rate-limit";
import {
  resolveOrphanTarget,
  validateColumnUpdate,
} from "@/features/job-tracker/lib/board-ops";
import { applicationsToCsv } from "@/features/job-tracker/lib/csv";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import {
  computeFunnel,
  countDueFollowUps,
} from "@/features/job-tracker/lib/stats";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import {
  addNoteSchema,
  applicationInputSchema,
  applicationUpdateSchema,
  moveApplicationSchema,
  updateColumnsSchema,
} from "@/features/job-tracker/schemas/job-tracker";
import { assertPaidPlan } from "@/features/job-tracker/server/plan-gate";
import { followUpEmailSystemPrompt } from "@/features/job-tracker/server/prompts/follow-up-email";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const DEFAULT_MODEL_MINI =
  process.env.DEFAULT_MODEL_MINI ?? "openai/gpt-4o-mini";

/** Fetch an application owned by the current user or throw NOT_FOUND. */
async function getOwnedApplication(
  ctx: { prisma: PrismaClient; session: { user: { id: string } } },
  id: string,
) {
  const app = await ctx.prisma.jobApplication.findUnique({ where: { id } });
  if (!app || app.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lamaran tidak ditemukan",
    });
  }
  return app;
}

export const jobTrackerRouter = createTRPCRouter({
  /** Board + all applications. Lazily creates the board with default columns. */
  getBoard: protectedProcedure.query(async ({ ctx }) => {
    await assertPaidPlan(ctx);
    const userId = ctx.session.user.id;

    let board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
    if (!board) {
      board = await ctx.prisma.jobBoard.create({
        data: {
          userId,
          columns: createDefaultColumns(() => crypto.randomUUID()),
        },
      });
    }

    const applications = await ctx.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    return { board: { id: board.id, columns: board.columns }, applications };
  }),

  /** Full-column replacement: add/rename/reorder/delete-custom. */
  updateColumns: protectedProcedure
    .input(updateColumnsSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      const userId = ctx.session.user.id;

      const board = await ctx.prisma.jobBoard.findUnique({
        where: { userId },
      });
      if (!board) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Board tidak ditemukan",
        });
      }

      // Prisma stores `kind` as a plain string; columns were validated on write.
      const result = validateColumnUpdate(
        board.columns as BoardColumn[],
        input.columns,
      );
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }

      // Relocate cards from deleted custom columns to the first column.
      if (result.removedColumnIds.length > 0) {
        const targetId = resolveOrphanTarget(input.columns);
        await ctx.prisma.jobApplication.updateMany({
          where: { userId, columnId: { in: result.removedColumnIds } },
          data: { columnId: targetId },
        });
      }

      const updated = await ctx.prisma.jobBoard.update({
        where: { userId },
        data: { columns: input.columns },
      });
      return { columns: updated.columns };
    }),

  createApplication: protectedProcedure
    .input(applicationInputSchema.extend({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      const userId = ctx.session.user.id;

      // Verify column exists on the user's board.
      const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
      if (!board?.columns.some((c) => c.id === input.columnId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kolom tidak valid",
        });
      }

      // If a CV is linked, it must belong to the user.
      if (input.cvId) {
        const cv = await ctx.prisma.cV.findUnique({
          where: { id: input.cvId },
          select: { userId: true },
        });
        if (!cv || cv.userId !== userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "CV tidak valid",
          });
        }
      }

      // Append at the end of the column.
      const count = await ctx.prisma.jobApplication.count({
        where: { userId, columnId: input.columnId },
      });

      const { columnId, jobUrl, ...rest } = input;
      const app = await ctx.prisma.jobApplication.create({
        data: {
          ...rest,
          jobUrl: jobUrl || null,
          userId,
          columnId,
          order: count,
          timeline: [],
        },
      });
      return app;
    }),

  updateApplication: protectedProcedure
    .input(applicationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await getOwnedApplication(ctx, input.id);

      if (input.data.cvId) {
        const cv = await ctx.prisma.cV.findUnique({
          where: { id: input.data.cvId },
          select: { userId: true },
        });
        if (!cv || cv.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "CV tidak valid",
          });
        }
      }

      const { jobUrl, ...rest } = input.data;
      return ctx.prisma.jobApplication.update({
        where: { id: input.id },
        data: {
          ...rest,
          ...(jobUrl !== undefined ? { jobUrl: jobUrl || null } : {}),
        },
      });
    }),

  deleteApplication: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await getOwnedApplication(ctx, input.id);
      await ctx.prisma.jobApplication.delete({ where: { id: input.id } });
      return { id: input.id };
    }),

  /** Drag-drop: set column+order; rewrites order of affected columns; appends
   *  a status_change timeline event when the column kind changes. */
  moveApplication: protectedProcedure
    .input(moveApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      const userId = ctx.session.user.id;
      const app = await getOwnedApplication(ctx, input.id);

      const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
      const targetCol = board?.columns.find((c) => c.id === input.columnId);
      if (!targetCol) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kolom tidak valid",
        });
      }
      const sourceCol = board?.columns.find((c) => c.id === app.columnId);

      const timelineEvent =
        sourceCol && sourceCol.kind !== targetCol.kind
          ? {
              id: crypto.randomUUID(),
              type: "status_change",
              fromKind: sourceCol.kind,
              toKind: targetCol.kind,
              note: null,
              createdAt: new Date(),
            }
          : null;

      // Rewrite target column order: fetch siblings, splice, persist.
      const siblings = await ctx.prisma.jobApplication.findMany({
        where: { userId, columnId: input.columnId, id: { not: input.id } },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const ids = siblings.map((s) => s.id);
      const insertAt = Math.min(input.order, ids.length);
      ids.splice(insertAt, 0, input.id);

      await ctx.prisma.$transaction([
        ...ids.map((id, order) =>
          ctx.prisma.jobApplication.update({
            where: { id },
            data:
              id === input.id
                ? {
                    columnId: input.columnId,
                    order,
                    ...(timelineEvent
                      ? { timeline: { push: timelineEvent } }
                      : {}),
                  }
                : { order },
          }),
        ),
      ]);

      return { id: input.id, columnId: input.columnId };
    }),

  addNote: protectedProcedure
    .input(addNoteSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await getOwnedApplication(ctx, input.id);
      return ctx.prisma.jobApplication.update({
        where: { id: input.id },
        data: {
          timeline: {
            push: {
              id: crypto.randomUUID(),
              type: "note",
              fromKind: null,
              toKind: null,
              note: input.note,
              createdAt: new Date(),
            },
          },
        },
      });
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    await assertPaidPlan(ctx);
    const userId = ctx.session.user.id;
    const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
    const apps = await ctx.prisma.jobApplication.findMany({
      where: { userId },
      select: { columnId: true, followUpDate: true },
    });
    return {
      total: apps.length,
      funnel: board ? computeFunnel(board.columns as BoardColumn[], apps) : [],
      dueFollowUps: countDueFollowUps(apps, new Date()),
    };
  }),

  exportCsv: protectedProcedure.mutation(async ({ ctx }) => {
    await assertPaidPlan(ctx);
    const userId = ctx.session.user.id;
    const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
    const colName = new Map(board?.columns.map((c) => [c.id, c.name]) ?? []);
    const apps = await ctx.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { appliedAt: "desc" },
    });
    const csv = applicationsToCsv(
      apps.map((a) => ({
        company: a.company,
        position: a.position,
        columnName: colName.get(a.columnId) ?? "",
        jobUrl: a.jobUrl,
        location: a.location,
        workType: a.workType,
        salaryMin: a.salaryMin,
        salaryMax: a.salaryMax,
        appliedAt: a.appliedAt,
        followUpDate: a.followUpDate,
      })),
    );
    return { csv };
  }),

  generateFollowUpEmail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await checkRateLimit(ctx.session.user.id, "ai:followUpEmail", 10);
      const app = await getOwnedApplication(ctx, input.id);

      const board = await ctx.prisma.jobBoard.findUnique({
        where: { userId: ctx.session.user.id },
      });
      const status =
        board?.columns.find((c) => c.id === app.columnId)?.name ?? "Dilamar";

      const response = await openrouter.chat.completions.create({
        model: DEFAULT_MODEL_MINI,
        stream: false,
        messages: [
          { role: "system", content: followUpEmailSystemPrompt },
          {
            role: "user",
            content: `Perusahaan: ${app.company}\nPosisi: ${app.position}\nStatus lamaran: ${status}\nTanggal melamar: ${app.appliedAt.toISOString().slice(0, 10)}`,
          },
        ],
        max_tokens: 500,
      });

      const email = response.choices[0]?.message?.content ?? "";
      if (!email) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat email follow-up. Coba lagi.",
        });
      }
      return { email };
    }),
});
