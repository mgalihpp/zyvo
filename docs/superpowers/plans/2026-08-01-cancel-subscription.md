# Cancel Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah fitur batal langganan — user aktif bisa batalkan, tier langsung turun ke Free seketika, dengan dialog konfirmasi ber-hint (termasuk garansi refund 7 hari untuk Pro).

**Architecture:** Status `Subscription.status` diubah jadi `"canceled"`; entitlement `getPlan` sudah fail-closed (`status !== "active"` → Free), jadi tidak ada ubah entitlement. Side-fix `applyPayment` agar re-buy setelah batal dianggap langganan baru. UI cuma di kartu "Paket Saya" (halaman Pengaturan).

**Tech Stack:** tRPC v11 (`billingRouter`), Prisma/MongoDB, Next.js App Router, React 19, shadcn/ui base-ui `AlertDialog`, `bun:test`.

## Global Constraints

- Copy string Bahasa Indonesia **verbatim** dari spec (dialog hint).
- `getPlan` fail-closed: jangan ubah `entitlements.ts` kecuali spesifik disebut.
- Refund **tidak** diimplementasikan — hanya hint UI.
- Ikuti pola `delete-account-form.tsx` (Button `loading`/`loadingText`, destructive pakai `className="rounded-full bg-destructive px-6 text-white hover:bg-destructive/80"`, tidak ada `variant="destructive"`).
- Test runner: `bun test`. Lint: `bun lint` (Biome). Path alias `@/*` → project root.

---

### Task 1: Fix `applyPayment` — re-buy setelah batal dianggap langganan baru

**Files:**
- Modify: `features/billing/server/apply-payment.ts:38-45`
- Create: `features/billing/server/apply-payment.test.ts`

**Interfaces:**
- Consumes: tidak ada (berdiri sendiri).
- Produces: `applyPayment(prisma, orderId, provider)` behavior baru: saat `existing.status !== "active"`, base expiry = `new Date()` (bukan `existing.expiresAt`).

**Kenapa:** User batal (status `"canceled"`, `expiresAt` masih masa depan) lalu re-buy. Tanpa fix, masa aktif baru dihitung dari `expiresAt` lama yang sudah dibatalkan — user dapat akses gratis setelah periode berakhir tanpa bayar. Fix: cek `existing.status === "active"`.

- [ ] **Step 1: Tulis failing test**

`features/billing/server/apply-payment.test.ts`:

```ts
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
      findUnique: async () => ({ userId: "u1", status: "pending", period: "monthly" }),
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
    const { stub, getCaptured } = prismaStub({ status: "canceled", expiresAt: oldExpiry });
    await applyPayment(stub, "order-1", {
      transaction_status: "settlement",
    });
    const captured = getCaptured();
    expect(captured).not.toBeNull();
    const base = captured!.update.expiresAt.getTime() - 30 * DAY;
    expect(base).toBeLessThan(oldExpiry.getTime());
    expect(base).toBeGreaterThan(NOW - DAY);
  });

  it("still extends from current expiry when active", async () => {
    const oldExpiry = new Date(NOW + 10 * DAY);
    const { stub, getCaptured } = prismaStub({ status: "active", expiresAt: oldExpiry });
    await applyPayment(stub, "order-1", {
      transaction_status: "settlement",
    });
    const captured = getCaptured();
    expect(captured!.update.expiresAt.getTime()).toBe(oldExpiry.getTime() + 30 * DAY);
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan FAIL**

Run: `bun test features/billing/server/apply-payment.test.ts`
Expected: test "starts fresh after cancellation" FAIL (base masih `oldExpiry`), test kedua PASS.

- [ ] **Step 3: Implement fix**

`features/billing/server/apply-payment.ts:39-42` — ganti:

```ts
    const base =
      existing && existing.expiresAt > new Date()
        ? existing.expiresAt
        : new Date();
```

menjadi:

```ts
    const base =
      existing &&
      existing.status === "active" &&
      existing.expiresAt > new Date()
        ? existing.expiresAt
        : new Date();
```

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `bun test features/billing/server/apply-payment.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Lint**

Run: `bun lint`
Expected: tidak ada error.

- [ ] **Step 6: Commit**

```bash
git add features/billing/server/apply-payment.ts features/billing/server/apply-payment.test.ts
git commit -m "fix(billing): start fresh when re-buying after cancellation"
```

---

### Task 2: Mutation `cancelSubscription` di `billingRouter`

**Files:**
- Modify: `features/billing/server/billing-router.ts` (sisipkan setelah `getSubscription`, sekitar baris 99)

**Interfaces:**
- Consumes: `createTRPCRouter`, `protectedProcedure` (sudah di file), `ctx.session.user.id`.
- Produces: `trpc.billing.cancelSubscription` mutation, no input, return `{ alreadyFree: true } | { canceled: true }`.

**Kenapa:** Titik masuk server. Idempotent — tidak throw untuk user yang sudah Free.

- [ ] **Step 1: Tambah mutation**

Sisipkan blok berikut tepat setelah prosedur `getSubscription` (setelah baris 99, sebelum `confirmPayment`):

```ts
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });
    if (!sub || sub.status === "canceled") {
      return { alreadyFree: true as const };
    }
    await ctx.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "canceled" },
    });
    return { canceled: true as const };
  }),
```

- [ ] **Step 2: Lint**

Run: `bun lint`
Expected: tidak ada error.

- [ ] **Step 3: Verifikasi behavior sudah tercakup test entitlements**

Perilaku "status canceled → Free" sudah diuji `entitlements.test.ts:42-47` ("returns free when status is not active", pakai `status: "canceled"`). Jalankan pastikan masih hijau:

Run: `bun test features/billing/server/entitlements.test.ts`
Expected: semua PASS.

- [ ] **Step 4: Commit**

```bash
git add features/billing/server/billing-router.ts
git commit -m "feat(billing): add cancelSubscription mutation"
```

---

### Task 3: Hook `useCancelSubscription` + komponen `CancelSubscriptionDialog`

**Files:**
- Modify: `features/billing/hooks/use-billing.ts` (tambah di akhir)
- Create: `features/billing/components/cancel-subscription-dialog.tsx`

**Interfaces:**
- Consumes: `trpc.billing.cancelSubscription` (dari Task 2), `AlertDialog` primitives, `Button`.
- Produces: `useCancelSubscription()` hook; `CancelSubscriptionDialog({ plan, onCanceled })` — default export, render tombol trigger sendiri + dialog konfirmasi.

**Kenapa:** UI dialog konfirmasi dengan hint (tier hilang seketika; Pro: garansi refund 7 hari).

- [ ] **Step 1: Tambah hook**

`features/billing/hooks/use-billing.ts` — append di akhir file:

```ts
export function useCancelSubscription() {
  return trpc.billing.cancelSubscription.useMutation();
}
```

- [ ] **Step 2: Buat komponen dialog**

`features/billing/components/cancel-subscription-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCancelSubscription } from "@/features/billing/hooks/use-billing";

const PLAN_LABELS = { basic: "Basic", pro: "Pro" } as const;

export default function CancelSubscriptionDialog({
  plan,
  onCanceled,
}: {
  plan: "basic" | "pro";
  onCanceled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelSubscription();

  const handleConfirm = async () => {
    await cancel.mutateAsync(undefined);
    setOpen(false);
    onCanceled();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" className="text-destructive hover:text-destructive">
            Batalkan Langganan
          </Button>
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan Langganan?</AlertDialogTitle>
          <AlertDialogDescription>
            Paket {PLAN_LABELS[plan]} kamu akan langsung berakhir. Akses fitur
            premium hilang seketika dan kamu turun ke paket Gratis.
            {plan === "pro" &&
              " Kamu berhak garansi uang kembali 7 hari — hubungi tim support kami untuk proses refund."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Kembali</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            loading={cancel.isPending}
            loadingText="Membatalkan…"
            className="rounded-full bg-destructive px-6 text-white hover:bg-destructive/80"
          >
            Batalkan Langganan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Lint**

Run: `bun lint`
Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add features/billing/hooks/use-billing.ts features/billing/components/cancel-subscription-dialog.tsx
git commit -m "feat(billing): add cancel subscription confirmation dialog"
```

---

### Task 4: Integrasi di kartu "Paket Saya" (halaman Pengaturan)

**Files:**
- Modify: `app/(dashboard)/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `CancelSubscriptionDialog` (Task 3), `useSubscription().refetch` (sudah ada di `use-billing.ts`).
- Produces: tombol batal langganan tampil di kartu "Paket Saya" saat sub aktif; setelah confirm, kartu menampilkan "Gratis".

**Kenapa:** Titik masuk UI (keputusan: Settings saja).

- [ ] **Step 1: Tambah lazy import**

Di `settings/page.tsx`, tambahkan di bawah lazy import `DeleteAccountForm` (sekitar baris 23-25):

```tsx
const CancelSubscriptionDialog = lazy(
  () => import("@/features/billing/components/cancel-subscription-dialog"),
);
```

- [ ] **Step 2: Ambil `refetch` dari hook**

Ubah destructure di baris 46:

```tsx
  const { data: sub, isLoading: subLoading } = useSubscription();
```

menjadi:

```tsx
  const { data: sub, isLoading: subLoading, refetch: refetchSub } =
    useSubscription();
```

- [ ] **Step 3: Render tombol + dialog di kartu "Paket Saya"**

Ubah blok tombol (baris 93-99):

```tsx
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/billing" />}
            className="relative overflow-hidden px-6 bg-foreground text-background hover:bg-foreground/90 billing-shine"
          >
            Tingkatkan
          </Button>
```

menjadi:

```tsx
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/billing" />}
              className="relative overflow-hidden px-6 bg-foreground text-background hover:bg-foreground/90 billing-shine"
            >
              Tingkatkan
            </Button>
            {sub && (
              <Suspense fallback={null}>
                <CancelSubscriptionDialog
                  plan={sub.plan as "basic" | "pro"}
                  onCanceled={refetchSub}
                />
              </Suspense>
            )}
          </div>
```

- [ ] **Step 4: Lint**

Run: `bun lint`
Expected: tidak ada error.

- [ ] **Step 5: Smoke test manual**

Run: `bun dev`, buka `/dashboard/settings` sebagai user dengan sub aktif.
- Kartu menampilkan tombol "Batalkan Langganan".
- Klik → dialog muncul dengan hint teks sesuai spec.
- Confirm → loading → kartu menampilkan "Gratis".

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "feat(billing): show cancel subscription button in settings"
```

---

### Task 5: Verifikasi penuh

- [ ] **Step 1: Semua test billing**

Run: `bun test features/billing/server`
Expected: semua PASS (entitlements + apply-payment).

- [ ] **Step 2: Lint full repo**

Run: `bun lint`
Expected: tidak ada error.

- [ ] **Step 3: Build**

Run: `bun build`
Expected: build sukses.
