import { describe, expect, it } from "bun:test";
import type { PrismaClient } from "@prisma/client";
import {
  __setRedisForTests,
  assertCvSlot,
  consumeAiQuota,
  getPlan,
  PLAN_LIMITS,
} from "./entitlements";

const FUTURE = new Date(Date.now() + 86_400_000);
const PAST = new Date(Date.now() - 86_400_000);

function prismaStub(overrides: {
  sub?: { plan: string; status: string; expiresAt: Date } | null;
  cvCount?: number;
}) {
  return {
    subscription: {
      findUnique: async () => overrides.sub ?? null,
    },
    cV: {
      count: async () => overrides.cvCount ?? 0,
    },
  } as unknown as PrismaClient;
}

function ctxWith(prisma: PrismaClient) {
  return { prisma, session: { user: { id: "u1" } } };
}

describe("getPlan", () => {
  it("returns free when no subscription row", async () => {
    expect(await getPlan(prismaStub({ sub: null }), "u1")).toBe("free");
  });
  it("returns free when subscription expired", async () => {
    const p = prismaStub({
      sub: { plan: "pro", status: "active", expiresAt: PAST },
    });
    expect(await getPlan(p, "u1")).toBe("free");
  });
  it("returns free when status is not active", async () => {
    const p = prismaStub({
      sub: { plan: "pro", status: "canceled", expiresAt: FUTURE },
    });
    expect(await getPlan(p, "u1")).toBe("free");
  });
  it("returns free for unknown plan string (fail-closed)", async () => {
    const p = prismaStub({
      sub: { plan: "enterprise", status: "active", expiresAt: FUTURE },
    });
    expect(await getPlan(p, "u1")).toBe("free");
  });
  it("returns basic and pro for active subs", async () => {
    const basic = prismaStub({
      sub: { plan: "basic", status: "active", expiresAt: FUTURE },
    });
    const pro = prismaStub({
      sub: { plan: "pro", status: "active", expiresAt: FUTURE },
    });
    expect(await getPlan(basic, "u1")).toBe("basic");
    expect(await getPlan(pro, "u1")).toBe("pro");
  });
});

describe("assertCvSlot", () => {
  it("blocks a free user at 1 CV", async () => {
    const ctx = ctxWith(prismaStub({ sub: null, cvCount: 1 }));
    await expect(assertCvSlot(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("allows a free user with 0 CVs", async () => {
    const ctx = ctxWith(prismaStub({ sub: null, cvCount: 0 }));
    await expect(assertCvSlot(ctx)).resolves.toBeUndefined();
  });
  it("blocks a basic user at 3 CVs", async () => {
    const ctx = ctxWith(
      prismaStub({
        sub: { plan: "basic", status: "active", expiresAt: FUTURE },
        cvCount: 3,
      }),
    );
    await expect(assertCvSlot(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("never blocks a pro user", async () => {
    const ctx = ctxWith(
      prismaStub({
        sub: { plan: "pro", status: "active", expiresAt: FUTURE },
        cvCount: 999,
      }),
    );
    await expect(assertCvSlot(ctx)).resolves.toBeUndefined();
  });
});

describe("consumeAiQuota", () => {
  it("blocks a free user once quota is exhausted", async () => {
    let count = PLAN_LIMITS.free.aiMonthlyQuota as number; // already at limit
    __setRedisForTests({
      get: async () => count,
      incr: async () => ++count,
      expire: async () => 1,
    });
    const ctx = ctxWith(prismaStub({ sub: null }));
    await expect(consumeAiQuota(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("allows and increments under quota", async () => {
    let count = 0;
    let incremented = false;
    __setRedisForTests({
      get: async () => count,
      incr: async () => {
        incremented = true;
        return ++count;
      },
      expire: async () => 1,
    });
    const ctx = ctxWith(prismaStub({ sub: null }));
    await expect(consumeAiQuota(ctx)).resolves.toBeUndefined();
    expect(incremented).toBe(true);
  });
  it("skips Redis entirely for pro (unlimited)", async () => {
    let touched = false;
    __setRedisForTests({
      get: async () => {
        touched = true;
        return 0;
      },
      incr: async () => {
        touched = true;
        return 1;
      },
      expire: async () => 1,
    });
    const ctx = ctxWith(
      prismaStub({
        sub: { plan: "pro", status: "active", expiresAt: FUTURE },
      }),
    );
    await expect(consumeAiQuota(ctx)).resolves.toBeUndefined();
    expect(touched).toBe(false);
  });
  it("fails open when Redis throws", async () => {
    __setRedisForTests({
      get: async () => {
        throw new Error("redis down");
      },
      incr: async () => {
        throw new Error("redis down");
      },
      expire: async () => 1,
    });
    const ctx = ctxWith(prismaStub({ sub: null }));
    await expect(consumeAiQuota(ctx)).resolves.toBeUndefined();
  });
});
