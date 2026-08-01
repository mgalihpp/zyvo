"use client";

import { lazy, Suspense } from "react";
import { BillingHeader } from "@/features/billing/components/billing-header";
import { BillingSkeleton } from "@/features/billing/components/billing-skeleton";
import { ResumeAlert } from "@/features/billing/components/resume-alert";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import type { PlanId as BillingPlanId } from "@/features/billing/lib/plans";

const MobilePlanList = lazy(() =>
  import("@/features/billing/components/mobile-plan-card").then((m) => ({
    default: m.MobilePlanList,
  })),
);

const DesktopPlanTable = lazy(() =>
  import("@/features/billing/components/desktop-plan-table").then((m) => ({
    default: m.DesktopPlanTable,
  })),
);

const FaqSection = lazy(() =>
  import("@/features/billing/components/faq-section").then((m) => ({
    default: m.FaqSection,
  })),
);

const PLAN_LABELS: Record<BillingPlanId, string> = {
  basic: "Basic",
  pro: "Pro",
};

export default function PlanPage() {
  const {
    yearly,
    setYearly,
    loadingPlanId,
    subscription,
    showResume,
    pendingPlanId,
    handleUpgrade,
    handleResumePayment,
    dismissResume,
  } = useCheckout();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <BillingHeader yearly={yearly} onYearlyChange={setYearly} />

      {showResume && pendingPlanId && (
        <ResumeAlert
          planName={PLAN_LABELS[pendingPlanId]}
          onContinue={handleResumePayment}
          onDismiss={dismissResume}
        />
      )}

      <Suspense fallback={<BillingSkeleton />}>
        <MobilePlanList
          yearly={yearly}
          onUpgrade={handleUpgrade}
          activePlan={subscription?.plan ?? "free"}
          loadingPlanId={loadingPlanId}
        />
        <DesktopPlanTable
          yearly={yearly}
          onUpgrade={handleUpgrade}
          activePlan={subscription?.plan ?? "free"}
          expiresAt={subscription?.expiresAt}
          loadingPlanId={loadingPlanId}
        />
        <FaqSection />
      </Suspense>
    </div>
  );
}
