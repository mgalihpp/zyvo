import crypto from "node:crypto";
import { SERVER_KEY } from "@/features/billing/lib/midtrans";
import { prisma } from "@/lib/db";

const TERMINAL_FAILED = new Set(["expire", "cancel", "deny", "failure"]);

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  incoming: string,
): boolean {
  const raw = `${orderId}${statusCode}${grossAmount}${SERVER_KEY}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === incoming;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    transaction_status: string;
    fraud_status?: string;
  };

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = body;

  if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
    return new Response("Forbidden", { status: 403 });
  }

  const tx = await prisma.transaction.findUnique({
    where: { orderId: order_id },
  });

  if (!tx) return new Response("Not found", { status: 404 });

  // Idempotency: jangan overwrite terminal states
  const currentlyPaid = tx.status === "settlement";
  const currentlyFailed = TERMINAL_FAILED.has(tx.status);
  if (currentlyPaid || currentlyFailed) {
    return new Response("OK", { status: 200 });
  }

  const isPaid =
    transaction_status === "settlement" ||
    (transaction_status === "capture" && fraud_status === "accept");

  if (isPaid) {
    const daysToAdd = tx.period === "yearly" ? 365 : 30;
    const expiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.transaction.update({
        where: { orderId: order_id },
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
  } else if (TERMINAL_FAILED.has(transaction_status)) {
    await prisma.transaction.update({
      where: { orderId: order_id },
      data: { status: transaction_status },
    });
  }
  // "pending" → no DB write needed (already pending)

  return new Response("OK", { status: 200 });
}
