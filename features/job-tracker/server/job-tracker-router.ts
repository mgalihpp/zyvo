import { TRPCError } from "@trpc/server";
import {
  resolveOrphanTarget,
  validateColumnUpdate,
} from "@/features/job-tracker/lib/board-ops";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import { updateColumnsSchema } from "@/features/job-tracker/schemas/job-tracker";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { assertPaidPlan } from "@/features/job-tracker/server/plan-gate";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

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
});
