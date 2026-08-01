"use client";

import { trpc } from "@/lib/trpc/client";

export function useCreateSnapToken() {
  return trpc.billing.createSnapToken.useMutation();
}

export function useSubscription() {
  const { data, isLoading, refetch } = trpc.billing.getSubscription.useQuery();
  return { data: data ?? null, isLoading, refetch };
}

export function useConfirmPayment() {
  return trpc.billing.confirmPayment.useMutation();
}

export function usePollStatus(orderId: string | null, enabled: boolean) {
  const { data, isError } = trpc.billing.getStatus.useQuery(
    { orderId: orderId ?? "" },
    {
      enabled: !!orderId && enabled,
      refetchInterval: 3_000,
      refetchIntervalInBackground: true,
    },
  );
  const status = data?.transactionStatus ?? null;
  const isPaid = status === "settlement" || status === "capture";
  return { status, isPaid, isError };
}

export function useCancelTransaction() {
  return trpc.billing.cancelTransaction.useMutation();
}

export function useCancelSubscription() {
  return trpc.billing.cancelSubscription.useMutation();
}
