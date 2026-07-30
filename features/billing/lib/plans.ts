export const PLANS = {
  basic: { label: "Basic", monthly: 15_000, yearly: 150_000 },
  pro: { label: "Pro", monthly: 75_000, yearly: 750_000 },
} as const;

export type PlanId = keyof typeof PLANS;
export type Period = "monthly" | "yearly";

export function getAmount(planId: PlanId, period: Period): number {
  return PLANS[planId][period];
}
