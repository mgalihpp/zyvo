"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCancelTransaction,
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
  const cancel = useCancelTransaction();
  const confirmPayment = useConfirmPayment();
  const { isPaid } = usePollStatus(orderId, polling);

  useEffect(() => {
    if (!isPaid || !polling) return;
    setPolling(false);
    setOrderId(null);
    setSnapToken(null);
    setPendingPlanId(null);
    setShowResume(false);
    pollCount.current = 0;
    if (orderId) {
      confirmPayment
        .mutateAsync({ orderId })
        .catch(() => undefined)
        .finally(() => refetchSubscription());
    }
  }, [isPaid, polling, orderId, confirmPayment, refetchSubscription]);

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

  function openSnap(token: string, orderId: string) {
    if (!window.snap) {
      window.location.href = `${SNAP_VTWEB_BASE}/${token}`;
      return;
    }

    window.snap.pay(token, {
      onSuccess: () => setPolling(true),
      onPending: () => setPolling(true),
      onError: () => {
        cancel.mutate({ orderId });
        setOrderId(null);
        setSnapToken(null);
        setPendingPlanId(null);
        setShowResume(false);
      },
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
        openSnap(result.snapToken, result.orderId);
      })
      .catch(() => setLoadingPlanId(null));
  }

  function handleResumePayment() {
    if (!snapToken || !orderId) return;
    setShowResume(false);
    openSnap(snapToken, orderId);
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
