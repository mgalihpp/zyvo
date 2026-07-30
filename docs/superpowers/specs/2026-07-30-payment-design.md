# Payment Integration Design — Midtrans Core API

**Date:** 2026-07-30  
**Product:** Zyvo (cv-maker-ai)  
**Status:** Approved

---

## 1. Merchant Readiness Summary

| Item | Status |
|---|---|
| Midtrans account / MID | confirmed |
| Sandbox dashboard access | confirmed |
| Sandbox credentials (server key + client key) | confirmed |
| Target environment | sandbox → Vercel (production) |
| Payment product | Core API |
| Payment methods | GoPay, QRIS, Kartu Kredit (CC), Virtual Account (VA) |
| Callback URL | `https://<vercel-domain>/api/midtrans/webhook` |
| Redirect URL (CC 3DS) | `https://<vercel-domain>/dashboard/billing?status=finish` |
| Proof level | local design → sandbox end-to-end |
| Subscription model | manual renewal (user klik tiap periode) |

---

## 2. Plans & Pricing

Sudah ada di `app/(dashboard)/dashboard/billing/page.tsx`. Tidak diubah kecuali:
- Tombol "Upgrade" dihubungkan ke `createCharge` tRPC call
- FAQ: "Stripe" → "GoPay, QRIS, kartu kredit, dan transfer bank"

| Plan | Bulanan | Tahunan |
|---|---|---|
| Free | Rp0 | Rp0 |
| Basic | Rp15.000 | Rp150.000 |
| Pro | Rp75.000 | Rp750.000 |

---

## 3. Feature Gating

| Fitur | Free | Basic | Pro |
|---|---|---|---|
| Unduh PDF | ✓ | ✓ | ✓ |
| Jumlah CV | 1 | 3 | ∞ |
| Template Premium | ✗ | ✓ | ✓ |
| Pelacak Lamaran | ✗ | ✓ | ✓ |
| Fitur AI | ✗ | ✗ | ✓ |

Gate check inline di tRPC procedures yang relevan:
```ts
const sub = await prisma.subscription.findUnique({ where: { userId } })
const isActive = sub?.status === "active" && sub.expiresAt > new Date()
```

---

## 4. Data Model

Tambah 2 model ke `prisma/schema.prisma`:

### Subscription
```prisma
model Subscription {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @unique
  plan      String   // "basic" | "pro"
  period    String   // "monthly" | "yearly"
  status    String   // "active" | "expired" | "cancelled"
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("subscription")
}
```

### Transaction
```prisma
model Transaction {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String
  subscriptionId   String?
  orderId          String   @unique  // format: "zyvo-{userId}-{timestamp}"
  amount           Int              // dalam IDR, integer
  paymentType      String           // "credit_card" | "gopay" | "qris" | "bank_transfer"
  bankName         String?          // untuk VA: "bca" | "mandiri" | "bni" | "bri"
  status           String           // "pending" | "creating" | "settlement" | "expire" | "cancel" | "deny"
  vaNumber         String?          // untuk VA
  qrCodeUrl        String?          // untuk QRIS
  gopayDeeplink    String?          // untuk GoPay
  expiresAt        DateTime?
  midtransResponse Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([userId])
  @@map("transaction")
}
```

**State transition rule:** Status diset ke `"creating"` **sebelum** HTTP call ke Midtrans. Jika Midtrans gagal, transaksi tetap identifiable sebagai `"creating"` (retryable), bukan hilang tanpa jejak.

---

## 5. File Structure

```
features/billing/
  lib/
    midtrans.ts          # Core API client (fetch wrapper, Basic Auth)
    plans.ts             # PLANS config (dipindah dari billing/page.tsx)
  server/
    billing-router.ts    # tRPC router
  hooks/
    use-billing.ts       # React Query hooks
  components/
    payment-modal.tsx    # Modal utama: pilih metode + tampilkan instruksi
    payment-methods.tsx  # Sub-komponen per metode (QR, VA number, CC redirect)

app/api/midtrans/
  webhook/
    route.ts             # POST handler webhook Midtrans
```

---

## 6. Midtrans Core API Client (`midtrans.ts`)

```ts
const BASE = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2"

const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64")

export async function midtransPost(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Midtrans ${path} failed: ${res.status}`)
  return res.json()
}

export async function midtransGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Authorization": `Basic ${auth}`, "Accept": "application/json" },
  })
  if (!res.ok) throw new Error(`Midtrans GET ${path} failed: ${res.status}`)
  return res.json()
}
```

---

## 7. tRPC Router (`billing-router.ts`)

Tiga prosedur, semua `protectedProcedure` (user harus login):

### `createCharge`
- Input: `{ planId: "basic" | "pro", period: "monthly" | "yearly", paymentType, bankName? }`
- Flow:
  1. Hitung `amount` dari PLANS config
  2. Generate `orderId = "zyvo-{userId}-{Date.now()}"`
  3. Simpan `Transaction` dengan status `"creating"`
  4. Panggil Midtrans Core API sesuai `paymentType`
  5. Update `Transaction` dengan instruksi pembayaran + status `"pending"`
  6. Return payload ke client

### `getStatus`
- Input: `{ orderId: string }`
- Flow: GET `/v2/{orderId}/status` ke Midtrans → return status terbaru
- Dipakai untuk polling dari client setiap 3 detik

### `getSubscription`
- Tanpa input
- Return `Subscription` aktif user atau `null`

### `cancelTransaction`
- Input: `{ orderId: string }`
- POST `/v2/{orderId}/cancel` ke Midtrans → update DB

---

## 8. Core API Payload per Metode

### GoPay
```json
{
  "payment_type": "gopay",
  "transaction_details": { "order_id": "...", "gross_amount": 75000 },
  "gopay": { "enable_callback": true, "callback_url": "https://<domain>/dashboard/billing" }
}
```
Response: `actions[0].url` = GoPay deeplink, `actions[1].url` = QR code image

### QRIS
```json
{
  "payment_type": "qris",
  "transaction_details": { "order_id": "...", "gross_amount": 75000 },
  "qris": { "acquirer": "gopay" }
}
```
Response: `actions[0].url` = QR code image URL

### Kartu Kredit (CC)
Memerlukan `token_id` dari Midtrans.js di frontend:
```json
{
  "payment_type": "credit_card",
  "transaction_details": { "order_id": "...", "gross_amount": 75000 },
  "credit_card": { "token_id": "<dari_midtrans_js>", "authentication": true }
}
```
Response: `redirect_url` untuk 3DS authentication

### Virtual Account (Bank Transfer)
```json
{
  "payment_type": "bank_transfer",
  "transaction_details": { "order_id": "...", "gross_amount": 75000 },
  "bank_transfer": { "bank": "bca" }
}
```
Response: `va_numbers[0].va_number`

---

## 9. Webhook Handler (`/api/midtrans/webhook/route.ts`)

**Verifikasi signature sebelum mutasi apapun:**
```
signature_key = SHA512(orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY)
```

**Idempotency rule — status tidak boleh mundur:**
```
pending → settlement/capture → (terminal)
expire / cancel / deny = terminal, tidak bisa dioverwrite oleh pending/cancel
```

**Flow setelah verifikasi:**
1. Jika `transaction_status === "settlement"` atau `"capture"`:
   - Update `Transaction.status = "settlement"`
   - Upsert `Subscription`: set `status = "active"`, hitung `expiresAt` baru (bulanan: +30 hari, tahunan: +365 hari)
2. Jika `expire` / `cancel` / `deny`:
   - Update `Transaction.status` saja
3. Return `200 OK` setelah DB berhasil diupdate

---

## 10. Payment Modal UX Flow

```
User klik "Upgrade"
  → Pilih period (bulanan/tahunan) — sudah ada di UI
  → Klik tombol per metode (GoPay / QRIS / CC / VA)
  → [CC only] Midtrans.js tokenize card → kirim token ke createCharge
  → Modal tampilkan instruksi:
      GoPay  → QR code + tombol "Buka GoPay"
      QRIS   → QR code image
      VA     → nomor VA + nama bank + batas waktu
      CC     → redirect ke halaman 3DS Midtrans
  → Polling getStatus tiap 3 detik (max 15 menit / 300 calls)
  → Jika settlement → tutup modal, tampilkan "Pembayaran berhasil!" → refresh subscription
  → Jika timeout → tampilkan "Waktu habis, coba lagi"
```

---

## 11. Environment Variables

Tambah ke `.env.local` dan Vercel dashboard:

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx   # sandbox
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx   # sandbox, exposed ke frontend
MIDTRANS_IS_PRODUCTION=false             # "true" di production
```

---

## 12. Blockers / Pre-implementation Checklist

- [ ] Konfirmasi metode VA yang aktif di sandbox (BCA, Mandiri, BNI, BRI)
- [ ] Set Payment Notification URL di Midtrans dashboard sandbox: `https://<vercel-preview-url>/api/midtrans/webhook`
- [ ] Midtrans.js dimuat di payment modal untuk tokenisasi CC
- [ ] Vercel environment variables dikonfigurasi sebelum deploy

---

## 13. Out of Scope (tidak diimplementasi sekarang)

- Refund/cancellation dari sisi merchant
- Midtrans Subscription API (auto-debit) — pakai manual renewal
- GoPayLater, ShopeePay, DANA, OTC (Alfamart/Indomaret)
- Email reminder sebelum subscription expired
- Admin dashboard untuk melihat transaksi
