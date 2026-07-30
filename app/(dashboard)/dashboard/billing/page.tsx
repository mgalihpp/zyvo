"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { BillingHeader } from "@/features/billing/components/billing-header";
import { BillingSkeleton } from "@/features/billing/components/billing-skeleton";
import {
  useCancelTransaction,
  useCreateSnapToken,
  usePollStatus,
  useSubscription,
} from "@/features/billing/hooks/use-billing";
import type { PlanId as BillingPlanId } from "@/features/billing/lib/plans";

const SNAP_VTWEB_BASE =
  process.env.NODE_ENV === "production"
    ? "https://app.midtrans.com/snap/v2/vtweb"
    : "https://app.sandbox.midtrans.com/snap/v2/vtweb";

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
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollCount = useRef(0);

  const { data: subscription } = useSubscription();
  const createToken = useCreateSnapToken();
  const cancel = useCancelTransaction();
  const { isPaid } = usePollStatus(orderId, polling);

  if (isPaid && polling) {
    setPolling(false);
    setOrderId(null);
    pollCount.current = 0;
  }

  async function handleUpgrade(planId: BillingPlanId) {
    const period = yearly ? "yearly" : "monthly";
    setLoadingPlanId(planId);
    const result = await createToken.mutateAsync({ planId, period });
    setLoadingPlanId(null);
    setOrderId(result.orderId);
    pollCount.current = 0;

    if (!window.snap) {
      window.location.href = `${SNAP_VTWEB_BASE}/${result.snapToken}`;
      return;
    }

    window.snap.pay(result.snapToken, {
      onSuccess: () => setPolling(true),
      onPending: () => setPolling(true),
      onError: () => {
        if (orderId) cancel.mutate({ orderId: result.orderId });
        setOrderId(null);
      },
      onClose: () => setPolling(true),
    });

    setPolling(true);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <BillingHeader yearly={yearly} onYearlyChange={setYearly} />

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
          loadingPlanId={loadingPlanId}
        />
        <FaqSection />
      </Suspense>
    </div>
  );
}
