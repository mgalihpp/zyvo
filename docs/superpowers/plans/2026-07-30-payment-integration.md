# Payment Integration (Midtrans Snap) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` (recommended) atau `superpowers:executing-plans` untuk execute task-by-task. Steps pakai checkbox (`- [ ]`) untuk tracking.

**Goal:** Integrasikan Midtrans Snap untuk terima pembayaran subscription Basic/Pro — Snap menampilkan semua metode (GoPay, QRIS, VA, CC) dalam hosted popup, merchant hanya buat token di backend.

**Architecture:** tRPC `billingRouter.createSnapToken` buat Snap token server-side; frontend buka Snap popup via `window.snap.pay(token)`; webhook verifikasi SHA512 + upsert Subscription. Snap hosting semua payment UI — tidak perlu komponen per-metode.

**Tech Stack:** Midtrans Snap API (`app.sandbox.midtrans.com/snap/v1`), Core API (`api.sandbox.midtrans.com/v2`) untuk status/cancel, tRPC v11, Zod v4, Prisma + MongoDB, Next.js `<Script>` untuk snap.js, React + TanStack Query.

## Global Constraints

- Snap token endpoint: `https://app.sandbox.midtrans.com/snap/v1/transactions` (sandbox) / `https://app.midtrans.com/snap/v1/transactions` (prod)
- Status/cancel endpoint: `https://api.sandbox.midtrans.com/v2` (sandbox) / `https://api.midtrans.com/v2` (prod) — **dua host berbeda, jangan campur**
- Auth: `Authorization: Basic base64(serverKey + ":")` — server key backend-only
- Client key (`MIDTRANS_CLIENT_KEY`) untuk `data-client-key` di snap.js — aman expose ke frontend
- `orderId` format: `zyvo-{userId}-{Date.now()}`
- Status `"creating"` disimpan **sebelum** HTTP call ke Midtrans
- Webhook idempotency: status tidak boleh mundur; `settlement`/`capture` → terminal paid; `expire`/`cancel`/`deny`/`failure` → terminal failed
- `capture` dianggap paid hanya jika `fraud_status === "accept"`
- Snap JS: load di root layout via Next.js `<Script strategy="afterInteractive">` dengan `data-client-key`
- Frontend callbacks (`onSuccess`, `onPending`, `onError`, `onClose`) = UX hint only — fulfill hanya dari webhook terverifikasi
- Harga IDR integer: Basic monthly=15000, yearly=150000; Pro monthly=75000, yearly=750000
- MongoDB ObjectId: `@id @default(auto()) @map("_id") @db.ObjectId`
- Semua tRPC procedures: `protectedProcedure` dari `@/server/trpc/trpc`; ctx punya `prisma` dan `session.user.id`

---

## File Map

| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — tambah model `Subscription` & `Transaction` |
| `features/billing/lib/midtrans.ts` | Create — dua client: snapPost + coreGet/corePost |
| `features/billing/lib/plans.ts` | Create — PLANS config + getAmount |
| `features/billing/server/billing-router.ts` | Create — tRPC router: createSnapToken, getStatus, getSubscription, cancelTransaction |
| `features/billing/hooks/use-billing.ts` | Create — React hooks wrapper |
| `features/billing/components/payment-modal.tsx` | Create — modal buka Snap popup |
| `app/api/midtrans/webhook/route.ts` | Create — POST webhook handler |
| `server/trpc/routers/_app.ts` | Modify — register `billing: billingRouter` |
| `app/layout.tsx` | Modify — tambah `<Script>` snap.js dengan `data-client-key` |
| `app/(dashboard)/dashboard/billing/page.tsx` | Modify — hubungkan tombol Upgrade + update FAQ |
| `.env.local` | Modify — tambah 3 env vars |

---

## Task 1: Prisma Schema — Tambah Subscription & Transaction

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `ctx.prisma.subscription` (findUnique, upsert) dan `ctx.prisma.transaction` (create, update, findUnique) tersedia di tRPC router dan webhook

- [ ] **Step 1: Append dua model ke akhir `prisma/schema.prisma`**

  ```prisma
  model Subscription {
    id        String   @id @default(auto()) @map("_id") @db.ObjectId
    userId    String   @unique
    plan      String
    period    String
    status    String
    expiresAt DateTime
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@map("subscription")
  }

  model Transaction {
    id               String    @id @default(auto()) @map("_id") @db.ObjectId
    userId           String
    orderId          String    @unique
    amount           Int
    planId           String
    period           String
    status           String
    snapToken        String?
    redirectUrl      String?
    midtransResponse Json?
    createdAt        DateTime  @default(now())
    updatedAt        DateTime  @updatedAt

    @@index([userId])
    @@map("transaction")
  }
  ```

  > `planId` dan `period` disimpan di Transaction sehingga webhook bisa resolve plan/expiry tanpa heuristic dari amount.

- [ ] **Step 2: Push schema ke MongoDB**

  ```bash
  bun db:push
  ```

  Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma Client**

  ```bash
  bun db:generate
  ```

- [ ] **Step 4: Typecheck**

  ```bash
  bun run build 2>&1 | head -30
  ```

  Expected: tidak ada error terkait `subscription` atau `transaction`.

- [ ] **Step 5: Commit**

  ```bash
  git add prisma/schema.prisma
  git commit -m "feat(billing): add Subscription and Transaction prisma models"
  ```

---

## Task 2: Env Variables & Midtrans Clients

**Files:**
- Modify: `.env.local`
- Create: `features/billing/lib/midtrans.ts`

**Interfaces:**
- Produces:
  - `snapPost(body: unknown): Promise<{ token: string; redirect_url: string }>` — buat Snap token
  - `coreGet(path: string): Promise<unknown>` — status lookup
  - `corePost(path: string, body?: unknown): Promise<unknown>` — cancel/expire

- [ ] **Step 1: Tambah env vars ke `.env.local`**

  ```env
  MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
  MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
  MIDTRANS_IS_PRODUCTION=false
  ```

  Ganti `xxxx` dengan credential sandbox dari Midtrans dashboard.

- [ ] **Step 2: Buat `features/billing/lib/midtrans.ts`**

  ```ts
  const IS_PROD = process.env.MIDTRANS_IS_PRODUCTION === "true";

  const SNAP_BASE = IS_PROD
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";

  const CORE_BASE = IS_PROD
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

  const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString(
    "base64",
  );

  const baseHeaders = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  export async function snapPost(body: unknown) {
    const res = await fetch(`${SNAP_BASE}/transactions`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Snap POST failed ${res.status}: ${text}`);
    }
    return res.json() as Promise<{ token: string; redirect_url: string }>;
  }

  export async function coreGet(path: string) {
    const res = await fetch(`${CORE_BASE}${path}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Core GET ${path} failed ${res.status}: ${text}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  export async function corePost(path: string, body: unknown = {}) {
    const res = await fetch(`${CORE_BASE}${path}`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Core POST ${path} failed ${res.status}: ${text}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }
  ```

- [ ] **Step 3: Lint**

  ```bash
  bun lint features/billing/lib/midtrans.ts
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add features/billing/lib/midtrans.ts .env.local
  git commit -m "feat(billing): add Midtrans Snap + Core API clients"
  ```

---

## Task 3: Plans Config

**Files:**
- Create: `features/billing/lib/plans.ts`

**Interfaces:**
- Produces:
  - `PLANS: Record<"basic" | "pro", { label: string; monthly: number; yearly: number }>`
  - `PlanId: "basic" | "pro"`
  - `Period: "monthly" | "yearly"`
  - `getAmount(planId: PlanId, period: Period): number`

- [ ] **Step 1: Buat `features/billing/lib/plans.ts`**

  ```ts
  export const PLANS = {
    basic: { label: "Basic", monthly: 15_000, yearly: 150_000 },
    pro: { label: "Pro", monthly: 75_000, yearly: 750_000 },
  } as const;

  export type PlanId = keyof typeof PLANS;
  export type Period = "monthly" | "yearly";

  export function getAmount(planId: PlanId, period: Period): number {
    return PLANS[planId][period];
  }
  ```

- [ ] **Step 2: Lint**

  ```bash
  bun lint features/billing/lib/plans.ts
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add features/billing/lib/plans.ts
  git commit -m "feat(billing): add plans config"
  ```

---

## Task 4: tRPC Billing Router

**Files:**
- Create: `features/billing/server/billing-router.ts`
- Modify: `server/trpc/routers/_app.ts`

**Interfaces:**
- Consumes:
  - `snapPost(body)` → `{ token: string; redirect_url: string }`
  - `coreGet("/v2/{orderId}/status")` → `{ transaction_status: string; ... }`
  - `corePost("/v2/{orderId}/cancel")` → `{}`
  - `getAmount(planId, period): number`
  - `ctx.prisma.transaction` dan `ctx.prisma.subscription`
  - `ctx.session.user.id: string`
- Produces (tRPC procedures):
  - `billing.createSnapToken` — mutation → `{ snapToken: string; orderId: string }`
  - `billing.getStatus` — query → `{ transactionStatus: string; orderId: string }`
  - `billing.getSubscription` — query → `Subscription | null`
  - `billing.cancelTransaction` — mutation → `{ ok: true }`

- [ ] **Step 1: Buat `features/billing/server/billing-router.ts`**

  ```ts
  import { TRPCError } from "@trpc/server";
  import { z } from "zod";
  import { coreGet, corePost, snapPost } from "@/features/billing/lib/midtrans";
  import { getAmount } from "@/features/billing/lib/plans";
  import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

  export const billingRouter = createTRPCRouter({
    createSnapToken: protectedProcedure
      .input(
        z.object({
          planId: z.enum(["basic", "pro"]),
          period: z.enum(["monthly", "yearly"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const { planId, period } = input;
        const amount = getAmount(planId, period);
        const orderId = `zyvo-${userId}-${Date.now()}`;

        await ctx.prisma.transaction.create({
          data: { userId, orderId, amount, planId, period, status: "creating" },
        });

        let snapRes: { token: string; redirect_url: string };
        try {
          snapRes = await snapPost({
            transaction_details: { order_id: orderId, gross_amount: amount },
            item_details: [
              {
                id: planId,
                price: amount,
                quantity: 1,
                name: `Zyvo ${planId === "basic" ? "Basic" : "Pro"} — ${period === "monthly" ? "Bulanan" : "Tahunan"}`,
              },
            ],
            credit_card: { secure: true },
            callbacks: {
              finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?status=finish`,
            },
          });
        } catch (err) {
          await ctx.prisma.transaction.update({
            where: { orderId },
            data: {
              status: "creating",
              midtransResponse: { error: String(err) },
            },
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Gagal membuat Snap token",
          });
        }

        await ctx.prisma.transaction.update({
          where: { orderId },
          data: {
            status: "pending",
            snapToken: snapRes.token,
            redirectUrl: snapRes.redirect_url,
          },
        });

        return { snapToken: snapRes.token, orderId };
      }),

    getStatus: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input }) => {
        const res = await coreGet(`/${input.orderId}/status`);
        return {
          transactionStatus: (res.transaction_status as string) ?? "not_found",
          orderId: input.orderId,
        };
      }),

    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      const sub = await ctx.prisma.subscription.findUnique({
        where: { userId: ctx.session.user.id },
      });
      const isActive =
        sub?.status === "active" && sub.expiresAt > new Date();
      return isActive ? sub : null;
    }),

    cancelTransaction: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await corePost(`/${input.orderId}/cancel`);
        await ctx.prisma.transaction.update({
          where: { orderId: input.orderId },
          data: { status: "cancel" },
        });
        return { ok: true as const };
      }),
  });
  ```

- [ ] **Step 2: Register di `server/trpc/routers/_app.ts`**

  Tambah import di atas:
  ```ts
  import { billingRouter } from "@/features/billing/server/billing-router";
  ```

  Tambah ke dalam `createTRPCRouter({...})`:
  ```ts
  billing: billingRouter,
  ```

- [ ] **Step 3: Build check**

  ```bash
  bun run build 2>&1 | head -50
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add features/billing/server/billing-router.ts server/trpc/routers/_app.ts
  git commit -m "feat(billing): add billing tRPC router with Snap token creation"
  ```

---

## Task 5: Webhook Handler

**Files:**
- Create: `app/api/midtrans/webhook/route.ts`

**Interfaces:**
- Consumes: `prisma` dari `@/lib/db` (direct import, bukan via tRPC ctx)
- POST body dari Midtrans: `{ order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status }`

- [ ] **Step 1: Buat `app/api/midtrans/webhook/route.ts`**

  ```ts
  import crypto from "node:crypto";
  import { prisma } from "@/lib/db";

  const TERMINAL_FAILED = new Set(["expire", "cancel", "deny", "failure"]);

  function verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    incoming: string,
  ): boolean {
    const raw = `${orderId}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY}`;
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
  ```

- [ ] **Step 2: Build check**

  ```bash
  bun run build 2>&1 | head -50
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/midtrans/webhook/route.ts
  git commit -m "feat(billing): add Midtrans webhook handler with SHA512 signature verification"
  ```

---

## Task 6: React Hooks

**Files:**
- Create: `features/billing/hooks/use-billing.ts`

**Interfaces:**
- Produces:
  - `useCreateSnapToken(): UseMutationResult<{ snapToken: string; orderId: string }, ...>`
  - `useSubscription(): { data: Subscription | null; isLoading: boolean }`
  - `usePollStatus(orderId: string | null, enabled: boolean): { status: string | null; isPaid: boolean }`
  - `useCancelTransaction(): UseMutationResult<{ ok: true }, ...>`

- [ ] **Step 1: Buat `features/billing/hooks/use-billing.ts`**

  ```ts
  "use client";

  import { trpc } from "@/lib/trpc/client";

  export function useCreateSnapToken() {
    return trpc.billing.createSnapToken.useMutation();
  }

  export function useSubscription() {
    const { data, isLoading } = trpc.billing.getSubscription.useQuery();
    return { data: data ?? null, isLoading };
  }

  export function usePollStatus(orderId: string | null, enabled: boolean) {
    const { data } = trpc.billing.getStatus.useQuery(
      { orderId: orderId ?? "" },
      {
        enabled: !!orderId && enabled,
        refetchInterval: 3_000,
        refetchIntervalInBackground: true,
      },
    );
    const status = data?.transactionStatus ?? null;
    const isPaid = status === "settlement" || status === "capture";
    return { status, isPaid };
  }

  export function useCancelTransaction() {
    return trpc.billing.cancelTransaction.useMutation();
  }
  ```

- [ ] **Step 2: Lint**

  ```bash
  bun lint features/billing/hooks/use-billing.ts
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add features/billing/hooks/use-billing.ts
  git commit -m "feat(billing): add billing React hooks"
  ```

---

## Task 7: Snap.js di Root Layout

**Files:**
- Modify: `app/layout.tsx`

**Tujuan:** Load `snap.js` dari root layout (stable boundary) sehingga tersedia sebelum `window.snap.pay()` dipanggil di modal. Wajib dilakukan sebelum payment modal dibuat.

- [ ] **Step 1: Baca `app/layout.tsx` untuk cari import dan struktur**

  Temukan di mana imports dan `<body>` tag.

- [ ] **Step 2: Tambah `<Script>` snap.js ke layout**

  Tambah import:
  ```tsx
  import Script from "next/script";
  ```

  Tambah di dalam `<body>` sebelum closing tag:
  ```tsx
  <Script
    src={
      process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js"
    }
    data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
    strategy="afterInteractive"
  />
  ```

- [ ] **Step 3: Tambah env vars publik ke `.env.local`**

  ```env
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
  NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```

  > `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` boleh expose ke frontend. `MIDTRANS_SERVER_KEY` tetap server-only dan tidak punya prefix `NEXT_PUBLIC_`.

- [ ] **Step 4: Build check**

  ```bash
  bun run build 2>&1 | head -30
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add app/layout.tsx .env.local
  git commit -m "feat(billing): load Midtrans snap.js in root layout"
  ```

---

## Task 8: Payment Modal

**Files:**
- Create: `features/billing/components/payment-modal.tsx`

**Interfaces:**
- Consumes:
  - `useCreateSnapToken()` dari `@/features/billing/hooks/use-billing`
  - `usePollStatus(orderId, enabled)` dari `@/features/billing/hooks/use-billing`
  - `useCancelTransaction()` dari `@/features/billing/hooks/use-billing`
  - `PlanId`, `Period`, `PLANS` dari `@/features/billing/lib/plans`
  - `window.snap.pay(token, callbacks)` — tersedia dari snap.js di layout
- Produces: `<PaymentModal planId, period, open, onOpenChange, onSuccess />`

- [ ] **Step 1: Tambah tipe global snap ke `types` atau inline**

  Buat file `features/billing/lib/snap.d.ts`:
  ```ts
  interface SnapCallbacks {
    onSuccess?: (result: unknown) => void;
    onPending?: (result: unknown) => void;
    onError?: (result: unknown) => void;
    onClose?: () => void;
  }

  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
      hide: () => void;
    };
  }
  ```

- [ ] **Step 2: Buat `features/billing/components/payment-modal.tsx`**

  ```tsx
  "use client";

  import { useEffect, useRef, useState } from "react";
  import { Button } from "@/components/ui/button";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
  import {
    useCancelTransaction,
    useCreateSnapToken,
    usePollStatus,
  } from "@/features/billing/hooks/use-billing";
  import { PLANS } from "@/features/billing/lib/plans";
  import type { Period, PlanId } from "@/features/billing/lib/plans";

  const POLL_LIMIT = 300; // 300 × 3s = 15 menit

  const IDR = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  export function PaymentModal({
    planId,
    period,
    open,
    onOpenChange,
    onSuccess,
  }: {
    planId: PlanId;
    period: Period;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
  }) {
    const plan = PLANS[planId];
    const amount = plan[period];

    const [orderId, setOrderId] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    const pollCount = useRef(0);

    const createToken = useCreateSnapToken();
    const cancel = useCancelTransaction();
    const { status, isPaid } = usePollStatus(orderId, polling);

    // Increment poll count setiap status berubah
    useEffect(() => {
      if (!polling || !orderId) return;
      pollCount.current += 1;
      if (pollCount.current >= POLL_LIMIT) {
        setPolling(false);
        setTimedOut(true);
      }
    }, [status, polling, orderId]);

    // Sukses
    useEffect(() => {
      if (isPaid) {
        setPolling(false);
        onSuccess();
        onOpenChange(false);
      }
    }, [isPaid, onSuccess, onOpenChange]);

    function reset() {
      setOrderId(null);
      setPolling(false);
      setTimedOut(false);
      pollCount.current = 0;
    }

    async function handlePay() {
      const result = await createToken.mutateAsync({ planId, period });
      setOrderId(result.orderId);

      if (!window.snap) {
        // Fallback redirect jika snap.js belum load
        window.location.href = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${result.snapToken}`;
        return;
      }

      window.snap.pay(result.snapToken, {
        onSuccess: () => setPolling(true),
        onPending: () => setPolling(true),
        onError: () => setPolling(false),
        onClose: () => {
          // Customer tutup popup — order masih bisa dilanjutkan
          setPolling(true); // tetap poll untuk cek apakah sempat berhasil
        },
      });

      setPolling(true);
    }

    async function handleCancel() {
      if (orderId) await cancel.mutateAsync({ orderId });
      reset();
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Upgrade ke {plan.label} —{" "}
              {IDR.format(amount)}/
              {period === "yearly" ? "tahun" : "bulan"}
            </DialogTitle>
          </DialogHeader>

          {timedOut && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-sm text-destructive">
                Waktu pembayaran habis. Silakan coba lagi.
              </p>
              <Button variant="outline" onClick={reset}>
                Coba Lagi
              </Button>
            </div>
          )}

          {!timedOut && !orderId && (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Klik tombol di bawah untuk memilih metode pembayaran — GoPay,
                QRIS, kartu kredit, atau transfer bank.
              </p>
              <Button
                onClick={handlePay}
                disabled={createToken.isPending}
                className="w-full"
              >
                {createToken.isPending ? "Memuat..." : "Lanjutkan ke Pembayaran"}
              </Button>
              {createToken.isError && (
                <p className="text-center text-xs text-destructive">
                  Gagal memuat pembayaran. Coba lagi.
                </p>
              )}
            </div>
          )}

          {!timedOut && orderId && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <p className="text-sm text-muted-foreground">
                Selesaikan pembayaran di jendela Midtrans yang terbuka. Halaman
                ini akan otomatis update setelah pembayaran berhasil.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={cancel.isPending}
              >
                Batalkan Transaksi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Step 3: Build check**

  ```bash
  bun run build 2>&1 | head -60
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add features/billing/components/payment-modal.tsx features/billing/lib/snap.d.ts
  git commit -m "feat(billing): add PaymentModal with Snap popup integration"
  ```

---

## Task 9: Billing Page — Hubungkan Upgrade & Update FAQ

**Files:**
- Modify: `app/(dashboard)/dashboard/billing/page.tsx`

**Interfaces:**
- Consumes:
  - `<PaymentModal />` dari `@/features/billing/components/payment-modal`
  - `useSubscription()` dari `@/features/billing/hooks/use-billing`
  - `PlanId` dari `@/features/billing/lib/plans`
  - State lokal: `modalOpen`, `selectedPlan`

- [ ] **Step 1: Tambah imports ke `billing/page.tsx`**

  ```tsx
  import { PaymentModal } from "@/features/billing/components/payment-modal";
  import { useSubscription } from "@/features/billing/hooks/use-billing";
  import type { PlanId } from "@/features/billing/lib/plans";
  ```

- [ ] **Step 2: Tambah state di dalam `PlanPage()`**

  ```tsx
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const { data: subscription } = useSubscription();

  function handleUpgrade(planId: PlanId) {
    setSelectedPlan(planId);
    setModalOpen(true);
  }
  ```

- [ ] **Step 3: Tambah prop `onUpgrade` ke `MobilePlanCard`**

  Ubah signature:
  ```tsx
  function MobilePlanCard({
    plan,
    yearly,
    onUpgrade,
  }: {
    plan: (typeof PLANS)[number];
    yearly: boolean;
    onUpgrade: (planId: PlanId) => void;
  })
  ```

  Ubah `Button` CTA di dalam `MobilePlanCard`:
  ```tsx
  <Button
    variant={plan.ctaVariant}
    onClick={plan.id !== "free" ? () => onUpgrade(plan.id as PlanId) : undefined}
    disabled={subscription?.plan === plan.id}
    className={cn(
      "shrink-0 font-semibold",
      isPro
        ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        : plan.ctaVariant === "default"
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "",
    )}
  >
    {subscription?.plan === plan.id ? "Aktif" : plan.cta}
  </Button>
  ```

  Update call site:
  ```tsx
  <MobilePlanCard key={plan.id} plan={plan} yearly={yearly} onUpgrade={handleUpgrade} />
  ```

- [ ] **Step 4: Update CTA row desktop table**

  Ubah `Button` di CTA row untuk plan berbayar:
  ```tsx
  <Button
    variant={plan.ctaVariant}
    onClick={plan.id !== "free" ? () => handleUpgrade(plan.id as PlanId) : undefined}
    disabled={subscription?.plan === plan.id}
    className={cn(
      "w-full text-sm font-semibold",
      isPro
        ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        : plan.ctaVariant === "default"
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "",
    )}
  >
    {subscription?.plan === plan.id ? "Aktif" : plan.cta}
  </Button>
  ```

- [ ] **Step 5: Update FAQ "Metode pembayaran"**

  Ubah dari:
  ```tsx
  a: "Kami menerima semua kartu kredit utama melalui Stripe."
  ```
  Menjadi:
  ```tsx
  a: "Kami menerima GoPay, QRIS, kartu kredit, dan transfer bank (Virtual Account BCA, Mandiri, BNI, BRI)."
  ```

- [ ] **Step 6: Tambah `<PaymentModal />` sebelum closing tag `</div>` terakhir**

  ```tsx
  <PaymentModal
    planId={selectedPlan}
    period={yearly ? "yearly" : "monthly"}
    open={modalOpen}
    onOpenChange={setModalOpen}
    onSuccess={() => {
      // TanStack Query auto-refetch subscription setelah modal tutup
    }}
  />
  ```

- [ ] **Step 7: Build check**

  ```bash
  bun run build 2>&1 | head -60
  ```

  Expected: clean build.

- [ ] **Step 8: Commit**

  ```bash
  git add "app/(dashboard)/dashboard/billing/page.tsx"
  git commit -m "feat(billing): wire Upgrade buttons to Snap PaymentModal, update FAQ"
  ```

---

## Task 10: Sandbox End-to-End Verification

**Files:** (tidak ada perubahan kode)

**Pre-requisites dari spec:**
- [ ] Sandbox credentials diisi di `.env.local` (semua 5 env vars)
- [ ] Payment Notification URL diset di Midtrans sandbox dashboard: `https://<vercel-preview-url>/api/midtrans/webhook`
- [ ] Finish redirect diset: `https://<vercel-preview-url>/dashboard/billing?status=finish`

- [ ] **Step 1: Jalankan dev server**

  ```bash
  bun dev
  ```

- [ ] **Step 2: Test Snap popup muncul**

  1. Buka `http://localhost:3000/dashboard/billing`
  2. Klik "Upgrade" di plan Basic atau Pro
  3. Verifikasi modal Zyvo muncul dengan tombol "Lanjutkan ke Pembayaran"
  4. Klik tombol — Snap popup Midtrans harus terbuka dengan pilihan metode

- [ ] **Step 3: Test GoPay settlement via sandbox**

  1. Di Snap popup, pilih GoPay
  2. Gunakan akun sandbox Midtrans untuk approve transaksi
  3. Atau trigger manual via Midtrans sandbox dashboard → Accept payment untuk order tersebut
  4. Verifikasi modal Zyvo menutup otomatis (polling berhasil detect settlement)
  5. Verifikasi collection `subscription` di MongoDB punya entry dengan `status: "active"`

- [ ] **Step 4: Test webhook signature rejection**

  ```bash
  curl -X POST http://localhost:3000/api/midtrans/webhook \
    -H "Content-Type: application/json" \
    -d "{\"order_id\":\"fake-order\",\"status_code\":\"200\",\"gross_amount\":\"75000\",\"signature_key\":\"invalid\",\"transaction_status\":\"settlement\"}"
  ```

  Expected: `403 Forbidden`

- [ ] **Step 5: Test webhook valid settlement**

  Hitung signature yang benar:
  ```bash
  echo -n "zyvo-<userId>-<timestamp>200150000<SERVER_KEY>" | sha512sum
  ```

  Kirim dengan signature yang benar ke webhook — verifikasi subscription diupdate di DB.

- [ ] **Step 6: Commit final**

  ```bash
  git commit --allow-empty -m "chore(billing): sandbox E2E verified"
  ```

---

## Checklist Pre-Deploy (Vercel)

- [ ] `MIDTRANS_SERVER_KEY` diset di Vercel (server-only, tanpa NEXT_PUBLIC_)
- [ ] `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` diset di Vercel
- [ ] `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` diset `"false"` (sandbox) atau `"true"` (prod)
- [ ] `NEXT_PUBLIC_APP_URL` diset ke domain Vercel
- [ ] Payment Notification URL di Midtrans dashboard → `https://<domain>/api/midtrans/webhook`
- [ ] Finish redirect URL → `https://<domain>/dashboard/billing?status=finish`
- [ ] Konfirmasi metode aktif di sandbox dashboard (GoPay, QRIS, CC, VA banks)
