import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

/**
 * Job tracker is a Basic/Pro feature. Called at the top of every jobTracker
 * procedure; free users get FORBIDDEN and the client renders the upsell view.
 */
export async function assertPaidPlan(ctx: {
  prisma: PrismaClient;
  session: { user: { id: string } };
}): Promise<void> {
  const sub = await ctx.prisma.subscription.findUnique({
    where: { userId: ctx.session.user.id },
  });
  const isActive = sub?.status === "active" && sub.expiresAt > new Date();
  if (!isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Fitur ini khusus paket Basic/Pro",
    });
  }
}
