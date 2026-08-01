import { describe, expect, it } from "bun:test";
import type { PrismaClient } from "@prisma/client";
import { applyPayment } from "./apply-payment";

type UpsertArgs = {
  create: { expiresAt: Date; status: string; plan: string };
  update: { expiresAt: Date; status: string; plan: string };
};

const NOW = Date.now();
const DAY = 86_400_000;

function prismaStub(existingSub: { status: string; expiresAt: Date } | null) {
  let captured: UpsertArgs | null = null;
  const stub = {
    transaction: {
      findUnique: async () => ({
        userId: "u1",
        status: "pending",
        period: "monthly",
      }),
      update: async () => undefined,
    },
    subscription: {
      findUnique: async () => existingSub,
      upsert: async (args: UpsertArgs) => {
        captured = args;
        return undefined;
      },
    },
    $transaction: async (ops: unknown[]) => {
      await Promise.all(ops);
    },
  };
  return { stub: stub as unknown as PrismaClient, getCaptured: () => captured };
}

describe("applyPayment re-buy base", () => {
  it("starts fresh after cancellation (status canceled, old expiry in future)", async () => {
    const oldExpiry = new Date(NOW + 30 * DAY);
    const { stub, getCaptured } = prismaStub({
      status: "canceled",
      expiresAt: oldExpiry,
    });
    await applyPayment(stub, "order-1", {
      transaction_status: "settlement",
    });
    const captured = getCaptured();
    if (!captured) throw new Error("upsert not called");
    const base = captured.update.expiresAt.getTime() - 30 * DAY;
    expect(base).toBeLessThan(oldExpiry.getTime());
    expect(base).toBeGreaterThan(NOW - DAY);
  });

  it("still extends from current expiry when active", async () => {
    const oldExpiry = new Date(NOW + 10 * DAY);
    const { stub, getCaptured } = prismaStub({
      status: "active",
      expiresAt: oldExpiry,
    });
    await applyPayment(stub, "order-1", {
      transaction_status: "settlement",
    });
    const captured = getCaptured();
    if (!captured) throw new Error("upsert not called");
    expect(captured.update.expiresAt.getTime()).toBe(
      oldExpiry.getTime() + 30 * DAY,
    );
  });
});
