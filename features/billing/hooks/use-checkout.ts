"use client";

import { useEffect, useRef, useState } from "react";
import {
  useConfirmPayment,
  useCreateSnapToken,
  usePollStatus,
  useSubscription,
} from "@/features/billing/hooks/use-billing";
import type { PlanId as BillingPlanId } from "@/features/billing/lib/plans";

const SNAP_VTWEB_BASE =
  process.env.NODE_ENV === "production"
    ? "https://app.midtrans.com/snap/v2/vtweb"
    : "https://app.sandbox.midtrans.com/snap/v2/vtweb";

const RESUME_KEY = "zyvo-resume-payment";

// 3s interval x 100 = 5 min of polling before giving up on a stale orderId.
const MAX_POLLS = 100;
const TERMINAL_FAILED = new Set(["expire", "cancel", "deny", "failure"]);

type ResumeState = {
  orderId: string;
  snapToken: string;
  planId: BillingPlanId;
  showResume: boolean;
};

/**
 * Midtrans Snap checkout flow. Shared by the billing page and the upsell
 * dialog so the pricing table always triggers the same payment flow.
 */
export function useCheckout() {
  const [yearly, setYearly] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<BillingPlanId | null>(
    null,
  );
  const [showResume, setShowResume] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollCount = useRef(0);

  const { data: subscription, refetch: refetchSubscription } =
    useSubscription();
  const createToken = useCreateSnapToken();
  const confirmPayment = useConfirmPayment();
  const { status, isPaid, isError } = usePollStatus(orderId, polling);

  useEffect(() => {
    if (!polling || !orderId) return;
    const terminal = !!status && TERMINAL_FAILED.has(status);
    if (isPaid || terminal) {
      setPolling(false);
      setOrderId(null);
      setSnapToken(null);
      setPendingPlanId(null);
      setShowResume(false);
      pollCount.current = 0;
    }
    if (isPaid) {
      confirmPayment
        .mutateAsync({ orderId })
        .catch(() => undefined)
        .finally(() => refetchSubscription());
    }
  }, [isPaid, status, polling, orderId, confirmPayment, refetchSubscription]);

  useEffect(() => {
    // E-wallet deeplinks auto-close Snap without firing onClose. Keep the
    // resume alert up while the transaction is still in flight so the user can
    // get back to it; it disappears once the status settles or fails.
    if (!orderId || !snapToken || !pendingPlanId) return;
    if (status === "pending") setShowResume(true);
  }, [status, orderId, snapToken, pendingPlanId]);

  useEffect(() => {
    if (!polling) return;
    // "not_found" is a normal pre-method-selection state in Snap — never clear
    // the checkout here. Just stop polling after a cap so a stale orderId from
    // localStorage doesn't ping forever; the resume dialog still stays usable.
    if (isError || status === "not_found") {
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) setPolling(false);
      return;
    }
    pollCount.current = 0;
  }, [isError, status, polling]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESUME_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ResumeState;
      if (!saved.snapToken || !saved.orderId) return;
      setOrderId(saved.orderId);
      setSnapToken(saved.snapToken);
      setPendingPlanId(saved.planId);
      setShowResume(saved.showResume);
      setPolling(true);
    } catch {
      localStorage.removeItem(RESUME_KEY);
    }
  }, []);

  useEffect(() => {
    if (!orderId || !snapToken || !pendingPlanId) {
      localStorage.removeItem(RESUME_KEY);
      return;
    }
    const state: ResumeState = {
      orderId,
      snapToken,
      planId: pendingPlanId,
      showResume,
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(state));
  }, [orderId, snapToken, pendingPlanId, showResume]);

  function openSnap(token: string) {
    if (!window.snap) {
      window.location.href = `${SNAP_VTWEB_BASE}/${token}`;
      return;
    }

    window.snap.pay(token, {
      onSuccess: () => setPolling(true),
      onPending: () => setPolling(true),
      // onError also closes the popup without completing payment. Keep the
      // order recoverable: show resume with the same snapToken so the customer
      // can retry, instead of cancelling + wiping the checkout.
      onError: () => setShowResume(true),
      onClose: () => setShowResume(true),
    });

    setPolling(true);
  }

  function handleUpgrade(planId: BillingPlanId) {
    const period = yearly ? "yearly" : "monthly";
    setLoadingPlanId(planId);
    createToken
      .mutateAsync({ planId, period })
      .then((result) => {
        setLoadingPlanId(null);
        setOrderId(result.orderId);
        setSnapToken(result.snapToken);
        setPendingPlanId(planId);
        setShowResume(false);
        pollCount.current = 0;
        openSnap(result.snapToken);
      })
      .catch(() => setLoadingPlanId(null));
  }

  function handleResumePayment() {
    if (!snapToken || !orderId) return;
    // Reopening reuses the same Snap token; onClose may not fire on a
    // re-opened session. Keep the resume alert up (it is covered by the popup
    // while Snap is open); status-based clearing handles the paid/terminal end.
    openSnap(snapToken);
  }

  function dismissResume() {
    setShowResume(false);
  }

  return {
    yearly,
    setYearly,
    loadingPlanId,
    subscription,
    showResume,
    pendingPlanId,
    handleUpgrade,
    handleResumePayment,
    dismissResume,
  };
}
