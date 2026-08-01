# Design: Batal Langganan (Cancel Subscription)

Date: 2026-08-01
Status: Approved (Approach A)

## Konteks

Model langganan Zyvo **bukan recurring**. User bayar sekali lewat Midtrans Snap →
mendapat akses 30 (monthly) / 365 (yearly) hari → habis → otomatis turun ke Free.
Tidak ada auto-renewal, tidak ada kartu tersimpan.

Saat ini tidak ada cara bagi user untuk membatalkan langganan. Tombol/copy di UI
sudah menjanjikan bisa ("Batalkan kapan saja" di `BILLING_PLANS`, FAQ "Bisakah saya
membatalkan langganan kapan saja?"), jadi fitur ini melengkapi janji tersebut.

## Keputusan Scope

- **Batal langganan → tier langsung hilang seketika** (downgrade ke Free, bukan
  tunggu akhir periode).
- **Refund TIDAK masuk scope.** Refund Pro (garansi 7 hari) ditangani manual via
  email/tim support. UI hanya menampilkan hint bahwa Pro berhak refund 7 hari.
- **UI hanya di halaman Pengaturan** (kartu "Paket Saya"), bukan di halaman billing.

## Perilaku

1. User dengan langganan aktif membuka Pengaturan → kartu "Paket Saya" → klik
   "Batalkan Langganan".
2. Muncul dialog konfirmasi (`AlertDialog`) dengan hint:
   - Paket berbayar langsung berakhir — akses fitur premium hilang seketika,
     turun ke paket Gratis.
   - (Hanya Pro) Garansi uang kembali 7 hari — hubungi tim support untuk
     proses refund.
3. Confirm → `billing.cancelSubscription` dipanggil → `subscription.status`
   diubah jadi `"canceled"` → entitlements langsung turun ke Free.
4. Kartu "Paket Saya" refetch dan menampilkan "Gratis".

## Backend

### `features/billing/server/billing-router.ts` — mutation `cancelSubscription`

- `protectedProcedure`, tanpa input (user id dari `ctx.session.user.id`).
- Alur:
  - `findUnique({ where: { userId } })`.
  - Tidak ada sub → return `{ alreadyFree: true }` (idempotent, tidak error).
  - `status === "canceled"` → return `{ alreadyFree: true }` (idempotent).
  - Lainnya (termasuk expired) → `update({ data: { status: "canceled" } })`,
    return `{ canceled: true }`.
- Tanpa interaksi Midtrans. Tidak ada refund.

### `features/billing/server/apply-payment.ts` — side-fix re-buy setelah batal

Saat ini base expiry saat re-buy memakai `existing.expiresAt` jika masih di masa
depan, tanpa peduli status. Setelah batal (status `"canceled"`) user sudah
kehilangan akses, jadi re-buy harus dianggap langganan baru:

```
base = existing && existing.status === "active" && existing.expiresAt > new Date()
  ? existing.expiresAt
  : new Date();
```

Perubahan kecil: tambah cek `existing.status === "active"` pada kondisi.

### Entitlement — tidak ada perubahan

`getPlan` (entitlements.ts:47) sudah fail-closed: `status !== "active"` → Free.
Dengan status `"canceled"`, tier langsung Free tanpa ubah kode entitlement.

## Frontend

### `features/billing/hooks/use-billing.ts`

Tambah:

```ts
export function useCancelSubscription() {
  return trpc.billing.cancelSubscription.useMutation();
}
```

### `features/billing/components/cancel-subscription-dialog.tsx` (baru)

- Props: `plan: string` (`"basic"` | `"pro"`), `onCanceled: () => void`.
- `AlertDialog` konfirmasi (pola ikut `delete-account-form.tsx`):
  - Body teks (Bahasa Indonesia):
    - "Paket {Basic|Pro} kamu akan langsung berakhir. Akses fitur premium hilang
      seketika dan kamu turun ke paket Gratis."
    - Pro: "Karena kamu berlangganan Pro, kamu berhak garansi uang kembali
      7 hari — hubungi tim support kami untuk proses refund."
  - Tombol: `Batalkan Langganan` (destructive) + `Tidak Jadi` (outline).
  - Submit → `useCancelSubscription().mutateAsync()` → `onCanceled()`.
  - `loading` state saat mutation berjalan.

### `app/(dashboard)/dashboard/settings/page.tsx` — kartu "Paket Saya"

- Saat `sub` ada (aktif): tampilkan tombol `Batalkan Langganan` (variant outline,
  destructive color) di bawah info paket, di samping tombol "Tingkatkan".
- Klik → render `<CancelSubscriptionDialog>` (Suspense lazy, pola komponen
  settings lain).
- `onCanceled` → refetch `useSubscription()` → kartu menampilkan "Gratis".

## Error Handling

- `cancelSubscription` idempotent: tidak pernah throw untuk kondisi "sudah free".
- Error tRPC (koneksi, DB) → dialog menampilkan state loading lalu error toast
  minimal / `console.error`; tidak menghapus status optimistik (tidak ada
  optimistik — tunggu hasil mutation baru update UI).

## Testing

- `features/billing/server/entitlements.test.ts`: tambah case —
  `getPlan` returns `"free"` saat `subscription.status === "canceled"` meskipun
  `expiresAt` masih di masa depan. (Perilaku kunci dari fitur ini.)
- `cancelSubscription`/`applyPayment` tidak diberi test framework tambahan;
  logika di atas thin wrapper Prisma + behavior sudah tercakup oleh test
  entitlements di atas.

## Non-Goals

- Refund otomatis (manual via email).
- Auto-renewal / Midtrans subscription API.
- Tombol batal di halaman billing.
- Penghapusan data CV saat downgrade (CV di atas limit tetap ada, tidak bisa
  buat baru — perilaku yang sudah ada untuk expiry, tidak diubah).
