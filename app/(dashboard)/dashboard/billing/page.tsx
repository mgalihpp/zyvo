"use client";

import { lazy, Suspense, useState } from "react";
import { BillingHeader } from "@/features/billing/components/billing-header";
import { BillingSkeleton } from "@/features/billing/components/billing-skeleton";
import { PaymentModal } from "@/features/billing/components/payment-modal";
import { useSubscription } from "@/features/billing/hooks/use-billing";
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

export default function PlanPage() {
  const [yearly, setYearly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId>("pro");
  const { data: subscription } = useSubscription();

  function handleUpgrade(planId: BillingPlanId) {
    setSelectedPlan(planId);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <BillingHeader yearly={yearly} onYearlyChange={setYearly} />

      <Suspense fallback={<BillingSkeleton />}>
        <MobilePlanList
          yearly={yearly}
          onUpgrade={handleUpgrade}
          activePlan={subscription?.plan}
        />
        <DesktopPlanTable
          yearly={yearly}
          onUpgrade={handleUpgrade}
          activePlan={subscription?.plan}
        />
        <FaqSection />
      </Suspense>

      <PaymentModal
        planId={selectedPlan}
        period={yearly ? "yearly" : "monthly"}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {}}
      />
    </div>
  );
}
