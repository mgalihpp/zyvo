import crypto from "node:crypto";
import { SERVER_KEY } from "@/features/billing/lib/midtrans";
import { applyPayment } from "@/features/billing/server/apply-payment";
import { prisma } from "@/lib/db";

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

  const result = await applyPayment(prisma, order_id, {
    transaction_status,
    fraud_status,
  });

  if (result === "not_found") return new Response("Not found", { status: 404 });

  return new Response("OK", { status: 200 });
}
