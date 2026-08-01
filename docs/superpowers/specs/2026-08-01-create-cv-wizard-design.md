# Create CV Wizard (dashboard "CV Baru")

**Tanggal:** 2026-08-01
**Status:** Approved design

## Ringkasan

Tombol "CV Baru" di dashboard saat ini langsung membuat CV kosong (`trpc.cv.create`) dan
redirect ke builder. Perubahan: tombol tersebut membuka wizard full-page (gaya
`AiGeneratorPage` / onboarding) di route baru `/builder/new`, di mana user memilih cara
membuat CV: **Manual**, **Import CV**, atau **AI**. AI tetap muncul sebagai link
"Atau buat dengan AI" di bawah dua kartu (bukan kartu sendiri, bukan lagi di dashboard).
Route `/dashboard/ai` dihapus (digantikan wizard).

## Perubahan

### 1. Route baru `app/(dashboard)/builder/new/page.tsx`

- Server component, guard auth (`auth.api.getSession` → redirect `SIGN_IN_PATH` bila
  tanpa session) — ikut pola halaman dashboard lain.
- Metadata: `constructMetadata({ title: "Buat CV" })`.
- Render `<OnboardingWizard mode="create" />`.
- Tanpa guard zero-CV (berbeda dari `/onboarding` yang tetap khusus user tanpa CV).

### 2. `OnboardingWizard` — tambah prop `mode`

File: `features/onboarding/components/onboarding-wizard.tsx`

- Prop baru `mode?: "onboarding" | "create"`, default `"onboarding"` (perilaku saat ini).
- `mode="create"`:
  - Tombol kanan atas labelnya **"Batal"**, `onClick` → `router.push("/dashboard")`
    (tanpa set skip cookie).
  - Di step 1, slot tombol kiri menampilkan **"Kembali"** → `router.push("/dashboard")`
    (saat ini slot itu `<span />` kosong di step 1).
  - Perilaku tombol "Kembali" untuk step > 1 tetap: mundur satu step.
- `mode="onboarding"`: perilaku sekarang (tombol "Lewati" set `ONBOARDING_SKIP_COOKIE`
  lalu `/dashboard`).
- Tambah `analytics.track("cv_created", { cv_id: cv.id })` di
  `createMutation.onSuccess` (dipindah dari dashboard, lihat #4).
- Nama komponen/file dipertahankan (bukan refactor besar).

### 3. `StepChooseMethod` — AI tetap jadi link

File: `features/onboarding/components/step-choose-method.tsx`

- Layout tidak berubah: dua kartu (Buat Manual, Import CV) + link "Atau buat dengan AI"
  di bawah.
- Link AI dibersihkan dari icon (tanpa `SparklesIcon`), teks polos saja.

### 4. Dashboard `CvList` — "CV Baru" jadi Link

File: `features/cv/components/dashboard/cv-list.tsx`

- Kartu "CV Baru" berubah dari `createMutation.mutate(undefined)` menjadi `Link` ke
  `/builder/new` (ubah jadi elemen `<Link>` dengan styling yang sama).
- Hapus `Link` "Atau buat dengan AI" di bawah kartu.
- Hapus `createMutation` yang tidak terpakai lagi (termasuk `analytics.track("cv_created")`
  yang dipindah ke wizard).

### 5. Hapus route `/dashboard/ai`

- Hapus `app/(dashboard)/dashboard/ai/page.tsx`.
- Hapus `features/ai/components/ai-generator-page.tsx` (tidak direferensikan lagi).
- Verifikasi tidak ada referensi lain ke `AiGeneratorPage` / `/dashboard/ai` (grep).

### 6. Builder "Buat CV Baru" → wizard

File: `features/cv/components/panels/panel-topbar.tsx`

- Tombol "Buat CV Baru" (dialog pindah CV di builder) berubah dari
  `createMutation.mutate(undefined)` menjadi navigasi ke `/builder/new`.
- `createMutation` di file ini dihapus bila tak terpakai lagi.

## Non-target

- `/onboarding` tetap: guard zero-CV dipertahankan, alur first-run tidak berubah.
- Alur manual/import/ai di wizard (step 2 pilih template, step 3 import/generate)
  tidak diubah.
- `trpc.cv.create` / `assertCvSlot` tidak diubah (server sudah handle).

## Verifikasi

- `bun lint` bersih.
- `bun build` sukses.
- Manually: dashboard → "CV Baru" → wizard muncul; manual → pilih template → builder;
  import → upload/paste → CV terisi; AI → form → CV terisi; "Batal" kembali ke dashboard.
- `/dashboard/ai` → 404.
