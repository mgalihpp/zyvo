export const PLANS = {
  basic: { label: "Basic", monthly: 5_000, yearly: 30_000 },
  pro: { label: "Pro", monthly: 20_000, yearly: 120_000 },
} as const;

export type PlanId = keyof typeof PLANS;
export type Period = "monthly" | "yearly";

export function getAmount(planId: PlanId, period: Period): number {
  return PLANS[planId][period];
}
