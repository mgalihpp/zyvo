# Plan Entitlements — Design

**Date:** 2026-08-01
**Status:** Approved

## Problem

Payment infrastructure (Midtrans, webhook, subscription upsert) works, but the
pricing matrix is barely enforced. Only the Job Tracker gates on subscription.
Gaps:

- AI router (7 procedures) fully ungated — free users get everything
- CV count limits (Free 1 / Basic 3) not enforced
- Premium templates not implemented (no flag, no gating)
- Basic vs Pro never differentiated (`assertPaidPlan` checks "any active sub")

## Decisions

| Question | Decision |
|---|---|
| Over-limit CVs after downgrade/expiry | Existing CVs stay viewable/editable/exportable; only `create`/`duplicate` blocked while over limit |
| AI gating | Monthly quota per tier: Free 5, Basic 50, Pro unlimited (combined counter across all AI endpoints, stored in Redis) |
| Premium templates | Implement now: `premium` flag in registry + server-side enforcement |
| Watermark claim | Out of scope — not implemented, pro-banner copy left as-is |
| Architecture | Centralized entitlements module (Option A) |

## Architecture

New module: `features/billing/server/entitlements.ts` — single source of truth.

```ts
export type PlanId = "free" | "basic" | "pro";

export const PLAN_LIMITS: Record<PlanId, {
  cvLimit: number | null;        // null = unlimited
  aiMonthlyQuota: number | null; // null = unlimited
  premiumTemplates: boolean;
  jobTracker: boolean;
}> = {
  free:  { cvLimit: 1,    aiMonthlyQuota: 5,  premiumTemplates: false, jobTracker: false },
  basic: { cvLimit: 3,    aiMonthlyQuota: 50, premiumTemplates: true,  jobTracker: true },
  pro:   { cvLimit: null, aiMonthlyQuota: null, premiumTemplates: true, jobTracker: true },
};
```

### Functions

- `getPlan(prisma, userId): Promise<PlanId>` — reads `Subscription`; returns
  `"free"` when no row, `status !== "active"`, `expiresAt <= now`, or plan
  string is not a known paid plan (fail-closed).
- `assertFeature(ctx, feature: "premiumTemplates" | "jobTracker")` — boolean
  gate; throws `TRPCError FORBIDDEN` with Indonesian message.
- `consumeAiQuota(ctx)` — Redis counter on key `ai:quota:{userId}:{YYYY-MM}`
  (TTL ~35 days). GET-then-INCR (small race acceptable; not billing-critical).
  Over quota → FORBIDDEN "Kuota AI bulan ini habis…". Redis unavailable →
  **fail-open** (log warning, allow) — consistent with existing rate-limit
  behavior.
- `assertCvSlot(ctx)` — `prisma.cv.count({ where: { userId } })`; throws
  FORBIDDEN when count >= `cvLimit`.

### Refactor

`features/job-tracker/server/plan-gate.ts` `assertPaidPlan` becomes a thin
wrapper over `assertFeature(ctx, "jobTracker")`. The 10 call sites in
`job-tracker-router.ts` are unchanged.

## Enforcement points

1. **AI** — all 7 procedures in `features/ai/server/ai-router.ts` call
   `consumeAiQuota(ctx)` after `checkRateLimit`. New query `ai.quotaStatus`
   returns remaining quota for UI display.
2. **CV create/duplicate** — `assertCvSlot(ctx)` at the top of `cv.create` and
   `cv.duplicate`. Existing CVs untouched (over-limit read-only falls out
   naturally: view/edit/export still work).
3. **Premium templates** — add `premium?: boolean` to `TemplateMeta` in
   `features/cv/components/templates/registry.ts`; mark templates in
   `index.ts`. Free: classic, minimal, modern, fresh-graduate, professional;
   premium: executive, creative, elegant, compact.
   Server enforcement in `cv.update` when `templateId` changes to a premium
   template, and in `cv.create` if template is part of input. Export route
   needs no check (premium template can never be persisted by a free user).
4. **Client UX** — "Premium" badge + lock in template picker; FORBIDDEN
   messages surface via existing toast pattern; dashboard create button shows
   upsell at limit (existing `useSubscription()` + CV count).

## Pricing copy consistency

`features/billing/lib/billing-constants.ts` FEATURES row "Fitur AI" becomes
`free: "5/bulan", basic: "50/bulan", pro: "Tak terbatas"`; related FAQ entries
updated to match. `PLAN_LIMITS` is the enforcement source of truth.

## Error handling

All gates throw `TRPCError` code `FORBIDDEN` with Indonesian user-facing
messages so clients can render upsells uniformly.

## Testing

- `getPlan`: expired sub → free; unknown plan string → free; active basic/pro.
- `assertCvSlot`: at limit → FORBIDDEN; under limit → passes; pro unlimited.
- `consumeAiQuota`: quota exhausted → FORBIDDEN; Redis down → fail-open;
  month rollover uses a fresh key.
- Template gate: free user updating to premium template → FORBIDDEN.
