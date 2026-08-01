# Plan Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the pricing matrix server-side: monthly AI quotas (Free 5 / Basic 50 / Pro unlimited), CV count limits (Free 1 / Basic 3 / Pro unlimited), and premium templates, via a centralized entitlements module.

**Architecture:** New `features/billing/server/entitlements.ts` resolves a user's plan from the `Subscription` table (fail-closed to `"free"`) and exposes gate helpers. Routers (AI, CV, job-tracker) call these helpers. Premium template ids live in a plain shared module importable from both server and client. Marketing copy in `billing-constants.ts` is updated to match.

**Tech Stack:** Next.js 16, tRPC v11, Prisma (MongoDB), Upstash Redis (`Redis.fromEnv()`), Zod v4, `bun test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-01-plan-entitlements-design.md`

## Global Constraints

- All gate failures throw `TRPCError` with code `FORBIDDEN` and Indonesian user-facing messages.
- Plan resolution is fail-closed: no subscription row, `status !== "active"`, `expiresAt <= now`, or unknown plan string → `"free"`.
- Redis unavailability in `consumeAiQuota` is fail-open: log a warning and allow the call.
- Limits: Free `{ cvLimit: 1, aiMonthlyQuota: 5, premiumTemplates: false, jobTracker: false }`; Basic `{ cvLimit: 3, aiMonthlyQuota: 50, premiumTemplates: true, jobTracker: true }`; Pro `{ cvLimit: null, aiMonthlyQuota: null, premiumTemplates: true, jobTracker: true }` (`null` = unlimited).
- Free templates: `classic`, `minimal`, `modern`, `fresh-graduate`, `professional`. Premium templates: `executive`, `creative`, `elegant`, `compact`.
- Lint/format with Biome (`bun lint`); commit after each task.
- Run tests with `bun test <file>`.

---

### Task 1: Entitlements module

**Files:**
- Create: `features/billing/server/entitlements.ts`
- Test: `features/billing/server/entitlements.test.ts`

**Interfaces:**
- Consumes: `@upstash/redis` (`Redis.fromEnv()`), `@trpc/server` (`TRPCError`), Prisma `subscription.findUnique` / `cV.count`.
- Produces (used by Tasks 2–7):
  - `type PlanId = "free" | "basic" | "pro"`
  - `interface PlanLimits { cvLimit: number | null; aiMonthlyQuota: number | null; premiumTemplates: boolean; jobTracker: boolean }`
  - `const PLAN_LIMITS: Record<PlanId, PlanLimits>`
  - `getPlan(prisma: PrismaClient, userId: string): Promise<PlanId>`
  - `assertFeature(ctx: EntitlementCtx, feature: "premiumTemplates" | "jobTracker"): Promise<void>`
  - `consumeAiQuota(ctx: EntitlementCtx): Promise<void>`
  - `getAiQuotaStatus(ctx: EntitlementCtx): Promise<{ used: number; limit: number | null }>`
  - `assertCvSlot(ctx: EntitlementCtx): Promise<void>`
  - `type EntitlementCtx = { prisma: PrismaClient; session: { user: { id: string } } }`

Note on testability: `getPlan` takes `prisma` as a parameter, so tests pass a stub object — no DB needed. Redis is accessed through a small internal indirection so tests can inject a fake (see implementation).

- [ ] **Step 1: Write the failing tests**

```ts
// features/billing/server/entitlements.test.ts
import { describe, expect, it } from "bun:test";
import type { PrismaClient } from "@prisma/client";
import {
  PLAN_LIMITS,
  __setRedisForTests,
  assertCvSlot,
  consumeAiQuota,
  getPlan,
} from "./entitlements";

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

function prismaStub(overrides: {
  sub?: { plan: string; status: string; expiresAt: Date } | null;
  cvCount?: number;
}) {
  return {
    subscription: {
      findUnique: async () => overrides.sub ?? null,
    },
    cV: {
      count: async () => overrides.cvCount ?? 0,
    },
  } as unknown as PrismaClient;
}

function ctxWith(prisma: PrismaClient) {
  return { prisma, session: { user: { id: "u1" } } };
}

describe("getPlan", () => {
  it("returns free when no subscription row", async () => {
    expect(await getPlan(prismaStub({ sub: null }), "u1")).toBe("free");
  });
  it("returns free when subscription expired", async () => {
    const p = prismaStub({
      sub: { plan: "pro", status: "active", expiresAt: PAST },
    });
    expect(await getPlan(p, "u1")).toBe("free");
  });
  it("returns free when status is not active", async () => {
    const p = prismaStub({
      sub: { plan: "pro", status: "canceled", expiresAt: FUTURE },
    });
    expect(await getPlan(p, "u1")).toBe("free");
  });
  it("returns free for unknown plan string (fail-closed)", async () => {
    const p = prismaStub({
      sub: { plan: "enterprise", status: "active", expiresAt: FUTURE },
    });
    expect(await getPlan(p, "u1")).toBe("free");
  });
  it("returns basic and pro for active subs", async () => {
    const basic = prismaStub({
      sub: { plan: "basic", status: "active", expiresAt: FUTURE },
    });
    const pro = prismaStub({
      sub: { plan: "pro", status: "active", expiresAt: FUTURE },
    });
    expect(await getPlan(basic, "u1")).toBe("basic");
    expect(await getPlan(pro, "u1")).toBe("pro");
  });
});

describe("assertCvSlot", () => {
  it("blocks a free user at 1 CV", async () => {
    const ctx = ctxWith(prismaStub({ sub: null, cvCount: 1 }));
    await expect(assertCvSlot(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("allows a free user with 0 CVs", async () => {
    const ctx = ctxWith(prismaStub({ sub: null, cvCount: 0 }));
    await expect(assertCvSlot(ctx)).resolves.toBeUndefined();
  });
  it("blocks a basic user at 3 CVs", async () => {
    const ctx = ctxWith(
      prismaStub({
        sub: { plan: "basic", status: "active", expiresAt: FUTURE },
        cvCount: 3,
      }),
    );
    await expect(assertCvSlot(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("never blocks a pro user", async () => {
    const ctx = ctxWith(
      prismaStub({
        sub: { plan: "pro", status: "active", expiresAt: FUTURE },
        cvCount: 999,
      }),
    );
    await expect(assertCvSlot(ctx)).resolves.toBeUndefined();
  });
});

describe("consumeAiQuota", () => {
  it("blocks a free user once quota is exhausted", async () => {
    let count = PLAN_LIMITS.free.aiMonthlyQuota as number; // already at limit
    __setRedisForTests({
      get: async () => count,
      incr: async () => ++count,
      expire: async () => 1,
    });
    const ctx = ctxWith(prismaStub({ sub: null }));
    await expect(consumeAiQuota(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("allows and increments under quota", async () => {
    let count = 0;
    let incremented = false;
    __setRedisForTests({
      get: async () => count,
      incr: async () => {
        incremented = true;
        return ++count;
      },
      expire: async () => 1,
    });
    const ctx = ctxWith(prismaStub({ sub: null }));
    await expect(consumeAiQuota(ctx)).resolves.toBeUndefined();
    expect(incremented).toBe(true);
  });
  it("skips Redis entirely for pro (unlimited)", async () => {
    let touched = false;
    __setRedisForTests({
      get: async () => {
        touched = true;
        return 0;
      },
      incr: async () => {
        touched = true;
        return 1;
      },
      expire: async () => 1,
    });
    const ctx = ctxWith(
      prismaStub({
        sub: { plan: "pro", status: "active", expiresAt: FUTURE },
      }),
    );
    await expect(consumeAiQuota(ctx)).resolves.toBeUndefined();
    expect(touched).toBe(false);
  });
  it("fails open when Redis throws", async () => {
    __setRedisForTests({
      get: async () => {
        throw new Error("redis down");
      },
      incr: async () => {
        throw new Error("redis down");
      },
      expire: async () => 1,
    });
    const ctx = ctxWith(prismaStub({ sub: null }));
    await expect(consumeAiQuota(ctx)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test features/billing/server/entitlements.test.ts`
Expected: FAIL — module `./entitlements` not found.

- [ ] **Step 3: Write the implementation**

```ts
// features/billing/server/entitlements.ts
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
  if (!sub || sub.status !== "active" || sub.expiresAt <= new Date()) {
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
    used = Number((await getQuotaRedis().get(quotaKey(ctx.session.user.id))) ?? 0);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test features/billing/server/entitlements.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Lint and commit**

```bash
bun lint
git add features/billing/server/entitlements.ts features/billing/server/entitlements.test.ts
git commit -m "feat(billing): add centralized plan entitlements module"
```

---

### Task 2: Refactor job-tracker plan gate onto entitlements

**Files:**
- Modify: `features/job-tracker/server/plan-gate.ts` (whole file, currently 23 lines)

**Interfaces:**
- Consumes: `assertFeature(ctx, "jobTracker")` from Task 1.
- Produces: `assertPaidPlan(ctx)` keeps its exact existing signature — the 10 call sites in `features/job-tracker/server/job-tracker-router.ts` (lines 49, 74, 115, 163, 192, 203, 263, 283, 298, 326) must not change.

- [ ] **Step 1: Replace the implementation**

Replace the entire body of `features/job-tracker/server/plan-gate.ts` with:

```ts
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
```

Note: behavior is identical for today's data (any active basic/pro sub passes) but now flows through `getPlan`, so unknown plan strings fail closed.

- [ ] **Step 2: Verify compile + existing tests**

Run: `bunx tsc --noEmit` and `bun test`
Expected: no type errors; entitlements tests still pass.

- [ ] **Step 3: Commit**

```bash
git add features/job-tracker/server/plan-gate.ts
git commit -m "refactor(job-tracker): route plan gate through entitlements module"
```

---

### Task 3: AI router — consume quota + quotaStatus query

**Files:**
- Modify: `features/ai/server/ai-router.ts`

**Interfaces:**
- Consumes: `consumeAiQuota(ctx)`, `getAiQuotaStatus(ctx)` from Task 1.
- Produces: new tRPC query `ai.quotaStatus` returning `{ used: number; limit: number | null }` (Task 6 UI reads this).

- [ ] **Step 1: Add imports and quota consumption**

In `features/ai/server/ai-router.ts` add to the imports:

```ts
import {
  consumeAiQuota,
  getAiQuotaStatus,
} from "@/features/billing/server/entitlements";
```

Then in **each of the 7 mutations** (`improve`, `score`, `chat`, `analyzeJD`, `coverLetter`, `generate`, `interviewPrep`), add `await consumeAiQuota(ctx);` on the line immediately after the existing `await checkRateLimit(...)` call. Example for `improve` (same pattern in all 7):

```ts
.mutation(async ({ ctx, input }) => {
  await checkRateLimit(ctx.session.user.id, "ai:improve", 20);
  await consumeAiQuota(ctx);
  // ...existing body unchanged
```

Ordering rationale: rate limit first (cheap abuse guard), quota second, so hammering an exhausted-quota endpoint still hits the hourly rate limit.

- [ ] **Step 2: Add the quotaStatus query**

Add as the first entry inside `createTRPCRouter({ ... })`:

```ts
quotaStatus: protectedProcedure.query(async ({ ctx }) => {
  return getAiQuotaStatus(ctx);
}),
```

- [ ] **Step 3: Verify compile**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add features/ai/server/ai-router.ts
git commit -m "feat(ai): enforce monthly AI quota per plan and expose quotaStatus"
```

---

### Task 4: CV router — enforce CV slot on create/duplicate

**Files:**
- Modify: `features/cv/server/cv-router.ts` (procedures `create` ~line 345 and `duplicate` ~line 410)

**Interfaces:**
- Consumes: `assertCvSlot(ctx)` from Task 1.
- Produces: no new interface; `cv.create` / `cv.duplicate` now throw FORBIDDEN at limit.

- [ ] **Step 1: Add import**

```ts
import { assertCvSlot } from "@/features/billing/server/entitlements";
```

- [ ] **Step 2: Gate `create`**

First line of the `create` mutation body, before `ctx.prisma.cV.create`:

```ts
.mutation(async ({ ctx, input }) => {
  await assertCvSlot(ctx);
  const cv = await ctx.prisma.cV.create({
```

- [ ] **Step 3: Gate `duplicate`**

First line of the `duplicate` mutation body, before the source lookup:

```ts
.mutation(async ({ ctx, input }) => {
  await assertCvSlot(ctx);
  const src = await ctx.prisma.cV.findUnique({ where: { id: input.id } });
```

Existing CVs are untouched — view/edit/export of over-limit CVs keeps working (spec: over-limit is read-only-for-creation, not locked).

- [ ] **Step 4: Verify compile + commit**

Run: `bunx tsc --noEmit`, then:

```bash
git add features/cv/server/cv-router.ts
git commit -m "feat(cv): enforce plan CV limit on create and duplicate"
```

---

### Task 5: Premium templates — shared list + server enforcement

**Files:**
- Create: `features/cv/lib/premium-templates.ts` (plain module, no React imports — safe for server)
- Modify: `features/cv/components/templates/registry.ts` (add `premium?: boolean` to `TemplateMeta`)
- Modify: `features/cv/components/templates/index.ts` (set `premium: true` on the 4 premium templates)
- Modify: `features/cv/server/cv-router.ts` (`create` and `update`)
- Test: `features/cv/lib/premium-templates.test.ts`

**Interfaces:**
- Consumes: `assertFeature(ctx, "premiumTemplates")` from Task 1.
- Produces:
  - `PREMIUM_TEMPLATE_IDS: ReadonlySet<string>` and `isPremiumTemplate(id: string | null | undefined): boolean` from `features/cv/lib/premium-templates.ts` (Task 6 client UI also imports these).
  - `TemplateMeta.premium?: boolean` on the registry type.

- [ ] **Step 1: Write the failing test**

```ts
// features/cv/lib/premium-templates.test.ts
import { describe, expect, it } from "bun:test";
import { isPremiumTemplate, PREMIUM_TEMPLATE_IDS } from "./premium-templates";

describe("premium templates", () => {
  it("marks exactly the 4 premium templates", () => {
    expect([...PREMIUM_TEMPLATE_IDS].sort()).toEqual([
      "compact",
      "creative",
      "elegant",
      "executive",
    ]);
  });
  it("free templates and unknown/missing ids are not premium", () => {
    expect(isPremiumTemplate("classic")).toBe(false);
    expect(isPremiumTemplate("minimal")).toBe(false);
    expect(isPremiumTemplate("modern")).toBe(false);
    expect(isPremiumTemplate("fresh-graduate")).toBe(false);
    expect(isPremiumTemplate("professional")).toBe(false);
    expect(isPremiumTemplate("nonexistent")).toBe(false);
    expect(isPremiumTemplate(null)).toBe(false);
    expect(isPremiumTemplate(undefined)).toBe(false);
  });
  it("premium ids are premium", () => {
    expect(isPremiumTemplate("executive")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/cv/lib/premium-templates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the shared module**

```ts
// features/cv/lib/premium-templates.ts
/**
 * Template ids gated behind Basic/Pro. Kept as a plain module (no component
 * imports) so the server can import it without pulling in React/lazy chunks.
 * Free: classic, minimal, modern, fresh-graduate, professional.
 */
export const PREMIUM_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  "executive",
  "creative",
  "elegant",
  "compact",
]);

export function isPremiumTemplate(id: string | null | undefined): boolean {
  return id != null && PREMIUM_TEMPLATE_IDS.has(id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/cv/lib/premium-templates.test.ts`
Expected: PASS.

- [ ] **Step 5: Flag templates in the registry**

In `features/cv/components/templates/registry.ts`, add to `TemplateMeta` (after the `categories` field):

```ts
  /** Gated behind Basic/Pro. Source of truth: features/cv/lib/premium-templates.ts */
  premium?: boolean;
```

In `features/cv/components/templates/index.ts`, add `premium: true,` to the entries for `executive`, `creative`, `elegant`, and `compact` (place it after `categories`).

- [ ] **Step 6: Enforce in cv-router**

In `features/cv/server/cv-router.ts` add imports:

```ts
import { assertFeature } from "@/features/billing/server/entitlements";
import { isPremiumTemplate } from "@/features/cv/lib/premium-templates";
```

In `create` (after the `assertCvSlot` call from Task 4):

```ts
await assertCvSlot(ctx);
if (isPremiumTemplate(input?.templateId)) {
  await assertFeature(ctx, "premiumTemplates");
}
```

In `update`, after the ownership check (`if (!existing || existing.userId !== ...) throw`), add:

```ts
if (
  input.data.templateId &&
  input.data.templateId !== existing.templateId &&
  isPremiumTemplate(input.data.templateId)
) {
  await assertFeature(ctx, "premiumTemplates");
}
```

Only *changing to* a premium template is gated — a downgraded user whose CV already uses a premium template can keep saving content edits (spec: over-limit/downgraded content stays editable).

Note: `duplicate` needs no template check — copying an own CV that already has a premium template preserves the status quo, consistent with the rule above.

- [ ] **Step 7: Verify compile + full tests + commit**

Run: `bunx tsc --noEmit` and `bun test`

```bash
git add features/cv/lib/premium-templates.ts features/cv/lib/premium-templates.test.ts features/cv/components/templates/registry.ts features/cv/components/templates/index.ts features/cv/server/cv-router.ts
git commit -m "feat(cv): gate premium templates server-side"
```

---

### Task 6: Client UX — premium badges, quota display, create-limit upsell

**Files:**
- Modify: `features/cv/components/panels/template-panel.tsx` (template cards ~line 117)
- Modify: `features/cv/components/dashboard/template-gallery.tsx` (template cards ~line 226)
- Modify: dashboard create-CV button component (locate via `trpc.cv.create.useMutation` usage under `features/cv/components/dashboard/`)

**Interfaces:**
- Consumes: `isPremiumTemplate` from Task 5; `useSubscription()` from `features/billing/hooks/use-billing.ts`; `trpc.ai.quotaStatus` from Task 3.
- Produces: presentational only.

This task is deliberately looser than the server tasks — exact JSX depends on each component's current markup. Requirements:

- [ ] **Step 1: Premium badge in template picker + gallery**

In both `template-panel.tsx` and `template-gallery.tsx`, on each template card where the template is premium (`isPremiumTemplate(t.id)` or `t.premium`), render a small badge (existing `Badge` component from `components/ui/`) labeled `Premium` with a `Lock` icon (`lucide-react`). Do NOT block selection client-side beyond visual affordance — the server rejects with FORBIDDEN and the existing toast/error pattern shows the Indonesian message. If these components already have an error-toast pattern for failed mutations, verify template-change errors surface through it; if template switching is store-only until autosave, ensure the autosave failure toast (existing pattern in `use-cv-autosave.ts`) shows the server message.

- [ ] **Step 2: Create-button limit handling**

In the dashboard component that calls `trpc.cv.create.useMutation` / `duplicate`: on mutation error with `error.data?.code === "FORBIDDEN"`, show the server message via the existing toast pattern (verify it already does — if the mutation has no `onError`, add one). No preemptive client-side count check (server is the authority; avoids drift).

- [ ] **Step 3: AI quota display**

Where AI features surface (the AI panel/menu under `features/ai/` or `features/cv/components/panels/` — locate via `trpc.ai.` usages), add a small quota line using `trpc.ai.quotaStatus.useQuery()`: render `"{limit - used} panggilan AI tersisa bulan ini"` when `limit !== null`, nothing when unlimited. Invalidate/refetch `quotaStatus` after each AI mutation settles.

- [ ] **Step 4: Manual verification**

Run: `bun dev` — verify: premium badge renders on the 4 premium templates in both pickers; AI quota line renders for a free user; creating a 2nd CV as a free user shows the FORBIDDEN toast.

- [ ] **Step 5: Lint + commit**

```bash
bun lint
git add -A
git commit -m "feat(billing): surface premium badges, AI quota, and CV limit errors in UI"
```

---

### Task 7: Pricing copy consistency

**Files:**
- Modify: `features/billing/lib/billing-constants.ts` (FEATURES row line 56, FAQS lines 65–75)

**Interfaces:**
- Consumes: nothing (plain copy edit; keep values consistent with `PLAN_LIMITS` in Task 1).
- Produces: marketing matrix matching enforcement.

- [ ] **Step 1: Update the FEATURES matrix**

Replace line 56:

```ts
  { label: "Fitur AI", values: { free: null, basic: null, pro: true } },
```

with:

```ts
  {
    label: "Fitur AI",
    values: { free: "5/bulan", basic: "50/bulan", pro: "Tak terbatas" },
  },
```

- [ ] **Step 2: Update FAQs**

Replace the answer of "Apa saja yang termasuk dalam paket Gratis?" with:

```ts
    a: "1 CV, unduhan PDF tak terbatas, dan 5 panggilan AI per bulan.",
```

Replace the answer of "Apa fitur tambahan di paket Basic?" with:

```ts
    a: "Hingga 3 CV, Template Premium, akses ke Pelacak Lamaran, dan 50 panggilan AI per bulan.",
```

Replace the answer of "Apa fitur tambahan di paket Pro?" with:

```ts
    a: "CV tak terbatas, Template Premium, Pelacak Lamaran, dan Fitur AI tanpa batas bulanan.",
```

- [ ] **Step 3: Verify compile + commit**

Run: `bunx tsc --noEmit`

```bash
git add features/billing/lib/billing-constants.ts
git commit -m "docs(billing): align pricing copy with enforced plan limits"
```

---

## Final verification

- [ ] `bun test` — all unit tests pass
- [ ] `bun lint` — clean
- [ ] `bun build` — production build succeeds
- [ ] Manual smoke (`bun dev`): free user — 2nd CV create blocked with toast; premium template switch rejected; 6th AI call blocked; quota line visible. Job tracker still gated.
