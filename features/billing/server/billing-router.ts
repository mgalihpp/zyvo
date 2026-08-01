import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { coreGet, corePost, snapPost } from "@/features/billing/lib/midtrans";
import { getAmount } from "@/features/billing/lib/plans";
import {
  applyPayment,
  TERMINAL_FAILED,
} from "@/features/billing/server/apply-payment";
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
    .query(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUnique({
        where: { orderId: input.orderId },
        select: { userId: true },
      });
      if (!tx || tx.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaksi tidak ditemukan",
        });
      }
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

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });
    if (!sub || sub.status === "canceled") {
      return { alreadyFree: true as const };
    }
    await ctx.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "canceled" },
    });
    return { canceled: true as const };
  }),

  confirmPayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUnique({
        where: { orderId: input.orderId },
      });
      if (!tx || tx.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaksi tidak ditemukan",
        });
      }

      if (tx.status === "settlement") return { paid: true };
      if (TERMINAL_FAILED.has(tx.status)) return { paid: false };

      let res: Record<string, unknown>;
      try {
        res = await coreGet(`/${input.orderId}/status`);
      } catch {
        return { paid: false };
      }

      const isPaid =
        res.transaction_status === "settlement" ||
        (res.transaction_status === "capture" && res.fraud_status === "accept");

      if (!isPaid) return { paid: false };

      await applyPayment(ctx.prisma, input.orderId, {
        transaction_status: res.transaction_status as string,
        fraud_status: res.fraud_status as string | undefined,
      });

      return { paid: true };
    }),

  cancelTransaction: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tx = await ctx.prisma.transaction.findUnique({
        where: { orderId: input.orderId },
      });
      if (!tx || tx.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaksi tidak ditemukan",
        });
      }
      await corePost(`/${input.orderId}/cancel`);
      await ctx.prisma.transaction.update({
        where: { orderId: input.orderId },
        data: { status: "cancel" },
      });
      return { ok: true as const };
    }),
});
