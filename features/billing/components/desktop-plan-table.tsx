"use client";

import { SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BILLING_PLANS,
  FEATURES,
  formatExpiryDate,
  formatPrice,
} from "@/features/billing/lib/billing-constants";
import type { PlanId as BillingPlanId } from "@/features/billing/lib/plans";
import { cn } from "@/lib/utils";
import { FeatureIcon } from "./feature-icon";

interface DesktopPlanTableProps {
  yearly: boolean;
  onUpgrade: (planId: BillingPlanId) => void;
  activePlan?: string | null;
  expiresAt?: Date | string | null;
  loadingPlanId?: string | null;
}

export function DesktopPlanTable({
  yearly,
  onUpgrade,
  activePlan,
  expiresAt,
  loadingPlanId,
}: DesktopPlanTableProps) {
  return (
    <div className="relative hidden overflow-hidden rounded-2xl border bg-card shadow-sm xl:block">
      {/* shine overlay — kolom Pro (kanan 1/4) */}
      <div
        aria-hidden
        className="billing-shine pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4"
      />

      {/* Plan headers */}
      <div className="grid grid-cols-4">
        <div className="p-6" />
        {BILLING_PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          const isPro = plan.id === "pro";
          return (
            <div
              key={plan.id}
              className={cn(
                "relative p-6",
                isPro ? "bg-primary text-primary-foreground" : "",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold">{plan.name}</p>
                {plan.popular && (
                  <div className="relative inline-flex rounded-full p-[2px] overflow-hidden">
                    <span
                      aria-hidden
                      className="animate-badge-orbit pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[200%] rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 0deg, #f59e0b, #ef4444, #ec4899, #8b5cf6, #3b82f6, #22d3ee, #22c55e, #f59e0b 360deg)",
                      }}
                    />
                    <Badge
                      className={cn(
                        "relative gap-1",
                        isPro ? "bg-white text-primary hover:bg-white/90" : "",
                      )}
                    >
                      <SparklesIcon className="size-2.5" />
                      POPULER
                    </Badge>
                  </div>
                )}
              </div>
              <p
                className={cn(
                  "text-xs",
                  isPro
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {plan.tagline}
              </p>

              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {formatPrice(price)}
                  </span>
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
                      "mt-1 text-xs",
                      isPro
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    100% gratis selamanya
                  </p>
                )}
                {price > 0 && yearly && (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      isPro
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatPrice(Math.round(plan.yearly / 12))}/bulan ditagih
                    tahunan
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Feature rows */}
      {FEATURES.map((feature) => (
        <div
          key={feature.label}
          className="grid grid-cols-4 border-b last:border-0"
        >
          <div className="flex items-center p-4 text-sm text-foreground/80">
            {feature.label}
          </div>
          {BILLING_PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex items-center justify-center border-l p-4 text-center",
                  isPro ? "bg-primary" : "",
                )}
              >
                <FeatureIcon value={feature.values[plan.id]} isPro={isPro} />
              </div>
            );
          })}
        </div>
      ))}

      {/* CTA row */}
      <div className="grid grid-cols-4 border-t">
        <div />
        {BILLING_PLANS.map((plan) => {
          const isPro = plan.id === "pro";
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col items-center gap-1 border-l p-5",
                isPro ? "bg-primary" : "",
              )}
            >
              <Button
                variant={plan.ctaVariant}
                onClick={
                  plan.id !== "free"
                    ? () => onUpgrade(plan.id as BillingPlanId)
                    : undefined
                }
                loading={loadingPlanId === plan.id}
                loadingText="Memuat..."
                disabled={
                  activePlan === plan.id ||
                  (activePlan === "pro" && plan.id !== "pro") ||
                  !!loadingPlanId
                }
                className={cn(
                  "w-full text-sm font-semibold",
                  isPro
                    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    : plan.ctaVariant === "default"
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "",
                )}
              >
                {activePlan === plan.id ? "Aktif" : plan.cta}
              </Button>
              <p
                className={cn(
                  "text-xs",
                  isPro
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                {plan.ctaNote}
              </p>
              {activePlan === plan.id && plan.id !== "free" && expiresAt && (
                <p
                  className={cn(
                    "text-xs",
                    isPro
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  Berlaku hingga {formatExpiryDate(expiresAt)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
