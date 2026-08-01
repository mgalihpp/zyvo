"use client";

import { Crown } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillingHeader } from "@/features/billing/components/billing-header";
import { BillingSkeleton } from "@/features/billing/components/billing-skeleton";
import { ResumeAlert } from "@/features/billing/components/resume-alert";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { PLANS } from "@/features/billing/lib/plans";

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

/**
 * Upsell dialog for any feature/quota blocked by the current plan. Shows the
 * same pricing table as the billing page; upgrading launches Midtrans Snap
 * directly from the dialog.
 */
export function PlanUpsellDialog({
  open,
  onOpenChange,
  title = "Upgrade Paket",
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
}) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl" scrollable>
        <DialogHeader className="items-center gap-1 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.55)]">
            <Crown className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showResume && pendingPlanId && (
            <ResumeAlert
              planName={PLANS[pendingPlanId].label}
              onContinue={handleResumePayment}
              onDismiss={dismissResume}
            />
          )}
          <div className="flex justify-center">
            <BillingHeader
              yearly={yearly}
              onYearlyChange={setYearly}
              showHeading={false}
            />
          </div>
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
          </Suspense>
        </div>

        <div className="flex justify-center">
          <DialogClose render={<Button variant="ghost">Nanti Saja</Button>} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shown when a free user tries to pick a premium template.
 */
export function PremiumTemplateUpsellDialog({
  open,
  onOpenChange,
  templateName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName?: string;
}) {
  return (
    <PlanUpsellDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Template Premium"
      description={`${
        templateName ? `Template ${templateName} khusus` : "Template ini khusus"
      } paket Basic/Pro. Pilih paket di bawah untuk membukanya.`}
    />
  );
}
