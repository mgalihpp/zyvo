import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { Redis } from "@upstash/redis";

export type PlanId = "free" | "basic" | "pro";

export interface PlanLimits {
  /** Max CVs a user may own; null = unlimited. */
  cvLimit: number | null;
  /** Combined AI calls per calendar month; null = unlimited. */
  aiMonthlyQuota: number | null;
  premiumTemplates: boolean;
  jobTracker: boolean;
}

/** Single source of truth for what each plan is entitled to. */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    cvLimit: 1,
    aiMonthlyQuota: 5,
    premiumTemplates: false,
    jobTracker: false,
  },
  basic: {
    cvLimit: 3,
    aiMonthlyQuota: 50,
    premiumTemplates: true,
    jobTracker: true,
  },
  pro: {
    cvLimit: null,
    aiMonthlyQuota: null,
    premiumTemplates: true,
    jobTracker: true,
  },
};

export type EntitlementCtx = {
  prisma: PrismaClient;
  session: { user: { id: string } };
};

/**
 * Resolve the effective plan. Fail-closed: anything other than an active,
 * unexpired subscription with a known paid plan string resolves to "free".
 */
export async function getPlan(
  prisma: PrismaClient,
  userId: string,
): Promise<PlanId> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.status !== "active" || sub.expiresAt < new Date()) {
    return "free";
  }
  return sub.plan === "basic" || sub.plan === "pro" ? sub.plan : "free";
}

const FEATURE_MESSAGES: Record<"premiumTemplates" | "jobTracker", string> = {
  premiumTemplates: "Template ini khusus paket Basic/Pro",
  jobTracker: "Fitur ini khusus paket Basic/Pro",
};

/** Boolean feature gate; throws FORBIDDEN when the plan lacks the feature. */
export async function assertFeature(
  ctx: EntitlementCtx,
  feature: "premiumTemplates" | "jobTracker",
): Promise<void> {
  const plan = await getPlan(ctx.prisma, ctx.session.user.id);
  if (!PLAN_LIMITS[plan][feature]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: FEATURE_MESSAGES[feature],
    });
  }
}

// Minimal Redis surface used by the quota counter; injectable for tests.
type QuotaRedis = {
  get: (key: string) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
};

let quotaRedis: QuotaRedis | null = null;

function getQuotaRedis(): QuotaRedis {
  if (!quotaRedis) quotaRedis = Redis.fromEnv();
  return quotaRedis;
}

/** Test-only: replace the Redis client with a fake. */
export function __setRedisForTests(fake: QuotaRedis): void {
  quotaRedis = fake;
}

function quotaKey(userId: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `ai:quota:${userId}:${month}`;
}

const QUOTA_TTL_SECONDS = 35 * 24 * 60 * 60; // ~35 days, outlives any month

/**
 * Consume one AI call from the user's monthly quota. Unlimited plans skip
 * Redis entirely. GET-then-INCR (small race acceptable; not billing-critical).
 * Fail-open on Redis errors so an outage never disables AI features.
 */
export async function consumeAiQuota(ctx: EntitlementCtx): Promise<void> {
  const plan = await getPlan(ctx.prisma, ctx.session.user.id);
  const quota = PLAN_LIMITS[plan].aiMonthlyQuota;
  if (quota === null) return;

  const key = quotaKey(ctx.session.user.id);
  let used: number;
  try {
    used = Number((await getQuotaRedis().get(key)) ?? 0);
  } catch (err) {
    console.warn("ai quota check failed, allowing request", err);
    return;
  }

  if (used >= quota) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Kuota AI bulan ini habis. Tingkatkan paket untuk kuota lebih besar.",
    });
  }

  try {
    const next = await getQuotaRedis().incr(key);
    if (next === 1) await getQuotaRedis().expire(key, QUOTA_TTL_SECONDS);
  } catch (err) {
    console.warn("ai quota increment failed", err);
  }
}

/** Remaining-quota readout for the UI. limit null = unlimited. */
export async function getAiQuotaStatus(
  ctx: EntitlementCtx,
): Promise<{ used: number; limit: number | null }> {
  const plan = await getPlan(ctx.prisma, ctx.session.user.id);
  const limit = PLAN_LIMITS[plan].aiMonthlyQuota;
  if (limit === null) return { used: 0, limit: null };
  let used = 0;
  try {
    used = Number(
      (await getQuotaRedis().get(quotaKey(ctx.session.user.id))) ?? 0,
    );
  } catch (err) {
    console.warn("ai quota status read failed", err);
  }
  return { used: Math.min(used, limit), limit };
}

/** Throws FORBIDDEN when creating one more CV would exceed the plan's limit. */
export async function assertCvSlot(ctx: EntitlementCtx): Promise<void> {
  const plan = await getPlan(ctx.prisma, ctx.session.user.id);
  const limit = PLAN_LIMITS[plan].cvLimit;
  if (limit === null) return;

  const count = await ctx.prisma.cV.count({
    where: { userId: ctx.session.user.id },
  });
  if (count >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Batas ${limit} CV untuk paketmu tercapai. Tingkatkan paket untuk membuat CV lagi.`,
    });
  }
}
