"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  LockIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BILLING_PLANS,
  FEATURES,
  formatPrice,
} from "@/features/billing/lib/billing-constants";
import type { PlanId as BillingPlanId } from "@/features/billing/lib/plans";
import { cn } from "@/lib/utils";

interface MobilePlanCardProps {
  plan: (typeof BILLING_PLANS)[number];
  yearly: boolean;
  onUpgrade: (planId: BillingPlanId) => void;
  activePlan?: string | null;
}

function MobilePlanCard({
  plan,
  yearly,
  onUpgrade,
  activePlan,
}: MobilePlanCardProps) {
  const [open, setOpen] = useState(false);
  const isPro = plan.id === "pro";
  const price = yearly ? plan.yearly : plan.monthly;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        isPro
          ? "billing-shine border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "bg-card",
      )}
    >
      {plan.popular && (
        <Badge
          className={cn(
            "absolute right-4 top-4 gap-1",
            isPro
              ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
              : "",
          )}
        >
          <SparklesIcon className="size-2.5" />
          POPULER
        </Badge>
      )}

      <p className="text-lg font-bold">{plan.name}</p>
      <p
        className={cn(
          "text-xs",
          isPro ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {plan.tagline}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatPrice(price)}</span>
            {price > 0 && (
              <span
                className={cn(
                  "text-sm",
                  isPro
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                /{yearly ? "tahun" : "bulan"}
              </span>
            )}
          </div>
          {price === 0 && (
            <p
              className={cn(
                "text-xs",
                isPro ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              100% gratis selamanya
            </p>
          )}
          {price > 0 && yearly && (
            <p
              className={cn(
                "text-xs",
                isPro ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {formatPrice(Math.round(plan.yearly / 12))}/bulan ditagih tahunan
            </p>
          )}
        </div>
        <Button
          variant={plan.ctaVariant}
          onClick={
            plan.id !== "free"
              ? () => onUpgrade(plan.id as BillingPlanId)
              : undefined
          }
          disabled={activePlan === plan.id}
          className={cn(
            "shrink-0 font-semibold",
            isPro
              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : plan.ctaVariant === "default"
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "",
          )}
        >
          {activePlan === plan.id ? "Aktif" : plan.cta}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mt-4 flex w-full items-center justify-between border-t pt-4 text-sm font-semibold",
          isPro ? "border-primary-foreground/20" : "border-border",
        )}
      >
        Paket ini mencakup
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180",
            isPro ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {FEATURES.map((f) => {
            const val = f.values[plan.id];
            return (
              <li
                key={f.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span
                  className={
                    isPro
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }
                >
                  {f.label}
                </span>
                <span className="font-medium">
                  {val === null ? (
                    <LockIcon
                      className={cn(
                        "size-4",
                        isPro
                          ? "text-primary-foreground/40"
                          : "text-muted-foreground/40",
                      )}
                    />
                  ) : val === true ? (
                    <CheckIcon
                      className={cn(
                        "size-4",
                        isPro ? "text-primary-foreground" : "text-foreground",
                      )}
                    />
                  ) : (
                    val
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface MobilePlanListProps {
  yearly: boolean;
  onUpgrade: (planId: BillingPlanId) => void;
  activePlan?: string | null;
}

export function MobilePlanList({
  yearly,
  onUpgrade,
  activePlan,
}: MobilePlanListProps) {
  return (
    <div className="flex flex-col gap-4 xl:hidden">
      {BILLING_PLANS.map((plan) => (
        <MobilePlanCard
          key={plan.id}
          plan={plan}
          yearly={yearly}
          onUpgrade={onUpgrade}
          activePlan={activePlan}
        />
      ))}
    </div>
  );
}
