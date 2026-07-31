import type { PrismaClient } from "@prisma/client";

export const TERMINAL_FAILED = new Set(["expire", "cancel", "deny", "failure"]);

type ProviderStatus = {
  transaction_status: string;
  fraud_status?: string;
};

/**
 * Applies a settled payment to the subscription, idempotently.
 * Shared by the Midtrans webhook and the client-side confirmPayment procedure.
 * Returns "not_found" when the order is unknown; "done" otherwise.
 */
export async function applyPayment(
  prisma: PrismaClient,
  orderId: string,
  provider: ProviderStatus,
): Promise<"not_found" | "done"> {
  const tx = await prisma.transaction.findUnique({ where: { orderId } });

  if (!tx) return "not_found";

  // Idempotency: jangan overwrite terminal states
  if (tx.status === "settlement" || TERMINAL_FAILED.has(tx.status)) {
    return "done";
  }

  const isPaid =
    provider.transaction_status === "settlement" ||
    (provider.transaction_status === "capture" &&
      provider.fraud_status === "accept");

  if (isPaid) {
    const daysToAdd = tx.period === "yearly" ? 365 : 30;
    const expiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.transaction.update({
        where: { orderId },
        data: { status: "settlement" },
      }),
      prisma.subscription.upsert({
        where: { userId: tx.userId },
        create: {
          userId: tx.userId,
          plan: tx.planId,
          period: tx.period,
          status: "active",
          expiresAt,
        },
        update: {
          plan: tx.planId,
          period: tx.period,
          status: "active",
          expiresAt,
        },
      }),
    ]);
  } else if (TERMINAL_FAILED.has(provider.transaction_status)) {
    await prisma.transaction.update({
      where: { orderId },
      data: { status: provider.transaction_status },
    });
  }
  // "pending" → no DB write needed (already pending)

  return "done";
}
