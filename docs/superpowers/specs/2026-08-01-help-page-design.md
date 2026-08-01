# Fitur "Butuh bantuan?" — Help Page Design

## Tujuan

User yang bingung atau mengalami masalah bisa mengakses bantuan dengan mudah dari dashboard. Entry point berupa link "Butuh bantuan?" di sidebar dashboard, membuka halaman bantuan berisi kontak dukungan + FAQ.

## Scope

- Link "Butuh bantuan?" di `SidebarFooter` dashboard, di atas baris profile user.
- Halaman `/dashboard/help` berisi:
  - Header + deskripsi.
  - Kartu kontak: Telegram + Email admin.
  - FAQ accordion.
- Statik, tanpa backend/tRPC.

## Arsitektur

### 1. Sidebar (`features/cv/components/dashboard/app-sidebar.tsx`)

- Tambah item link "Butuh bantuan?" (ikon `HelpCircleIcon` dari lucide-react) di `SidebarFooter`, tepat di atas menu profile user (baris `SidebarMenu` profile dropdown).
- Link ke `/dashboard/help`, style menyesuaikan item sidebar yang sudah ada.
- Active state: `pathname.startsWith("/dashboard/help")`.

### 2. Route (`app/(dashboard)/dashboard/help/page.tsx`)

- Server component, dilindungi otomatis oleh `DashboardLayout` (auth check).
- Render `HelpPage` dari `features/help`.

### 3. Feature (`features/help/`)

- `lib/contact.ts` — satu file konfigurasi kontak:
  ```ts
  export const SUPPORT_CONTACT = {
    telegramUrl: "https://t.me/zyvo",
    email: "halo@zyvo.id",
  } as const;
  ```
  Placeholder; user tinggal ganti nilai.
- `lib/faq-data.ts` — daftar FAQ dashboard (pertanyaan umum: cara buat CV, kuota AI habis, ganti template, export PDF, billing/payment, autosave, hapus akun).
- `components/help-page.tsx` — konten halaman, pakai shadcn `Card`, `Accordion`, `Button`.

### Data flow

Statik penuh. Tidak ada data fetching, tidak ada mutasi, tidak ada tRPC.

## Error handling

Tidak relevan — konten statik, link eksternal (Telegram) & mailto.

## Testing

- Manual: klik link sidebar, verifikasi halaman render, FAQ expand/collapse, link Telegram/email terbuka.
- Tidak perlu test otomatis (statik, trivial).

## Out of scope

- Form kontak / tiket.
- Chat support live.
- Halaman bantuan publik (marketing).
