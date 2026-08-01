import type { PrismaClient } from "@prisma/client";
import { assertFeature } from "@/features/billing/server/entitlements";

/**
 * Job tracker is a Basic/Pro feature. Called at the top of every jobTracker
 * procedure; free users get FORBIDDEN and the client renders the upsell view.
 */
export async function assertPaidPlan(ctx: {
  prisma: PrismaClient;
  session: { user: { id: string } };
}): Promise<void> {
  await assertFeature(ctx, "jobTracker");
}
