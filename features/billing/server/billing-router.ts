import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { coreGet, corePost, snapPost } from "@/features/billing/lib/midtrans";
import { getAmount } from "@/features/billing/lib/plans";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const billingRouter = createTRPCRouter({
  createSnapToken: protectedProcedure
    .input(
      z.object({
        planId: z.enum(["basic", "pro"]),
        period: z.enum(["monthly", "yearly"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { planId, period } = input;
      const amount = getAmount(planId, period);
      const orderId = `zyvo-${userId.slice(0, 20)}-${Date.now()}`;

      await ctx.prisma.transaction.create({
        data: { userId, orderId, amount, planId, period, status: "creating" },
      });

      let snapRes: { token: string; redirect_url: string };
      try {
        snapRes = await snapPost({
          transaction_details: { order_id: orderId, gross_amount: amount },
          item_details: [
            {
              id: planId,
              price: amount,
              quantity: 1,
              name: `Zyvo ${planId === "basic" ? "Basic" : "Pro"} — ${period === "monthly" ? "Bulanan" : "Tahunan"}`,
            },
          ],
          credit_card: { secure: true },
          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=finish`,
          },
        });
      } catch (err) {
        console.error("[billing] snapPost failed:", err);
        await ctx.prisma.transaction.update({
          where: { orderId },
          data: {
            status: "creating",
            midtransResponse: { error: String(err) },
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat Snap token",
        });
      }

      await ctx.prisma.transaction.update({
        where: { orderId },
        data: {
          status: "pending",
          snapToken: snapRes.token,
          redirectUrl: snapRes.redirect_url,
        },
      });

      return { snapToken: snapRes.token, orderId };
    }),

  getStatus: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const res = await coreGet(`/${input.orderId}/status`);
      return {
        transactionStatus: (res.transaction_status as string) ?? "not_found",
        orderId: input.orderId,
      };
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });
    const isActive = sub?.status === "active" && sub.expiresAt > new Date();
    return isActive ? sub : null;
  }),

  cancelTransaction: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await corePost(`/${input.orderId}/cancel`);
      await ctx.prisma.transaction.update({
        where: { orderId: input.orderId },
        data: { status: "cancel" },
      });
      return { ok: true as const };
    }),
});
