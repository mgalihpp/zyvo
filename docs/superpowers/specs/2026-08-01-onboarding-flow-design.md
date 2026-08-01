# Onboarding Flow untuk User Baru — Design

**Date:** 2026-08-01
**Status:** Approved

## Goal

User baru (belum punya CV) mendapat onboarding wizard: pilih cara membuat CV (manual / import CV yang sudah ada) → pilih template → masuk builder. Untuk import, semua data dari CV lama otomatis terisi via AI parsing.

## Routing & Entry

- Route baru: `app/(dashboard)/onboarding/page.tsx` — full-page wizard tanpa sidebar dashboard (layout sendiri yang clean).
- `app/(dashboard)/dashboard/page.tsx` sudah server-fetch `trpc.cv.list()`; jika `initialCvs.length === 0` **dan** flag skip tidak ada → `redirect("/onboarding")`.
- Tombol **"Lewati"** di onboarding → set flag `zyvo_onboarding_skipped` (cookie) → navigasi ke `/dashboard`. Dashboard cek flag ini supaya tidak redirect loop; empty state lama di `cv-list.tsx` tetap menjadi fallback.
- Jika user sudah punya CV tapi membuka `/onboarding` manual → redirect ke `/dashboard` (cek server-side via `cv.list`).

## Wizard Steps

State wizard lokal via `useState` di `onboarding-wizard.tsx` — tidak perlu store baru.

### Step 1 — Pilih cara

Dua kartu besar: **"Buat Manual"** dan **"Import CV"**. Di bawahnya link kecil "✨ Atau buat dengan AI" yang membuka `AiGeneratorModal` yang sudah ada (flow AI generator tidak berubah).

### Step 2 — Pilih template

Grid template reuse pola thumbnail dari `features/cv/components/dashboard/template-gallery.tsx`: `CvThumbnail` dengan `SAMPLE_CV`, badge Crown untuk template premium, filter kategori. Klik template → lanjut ke step 3.

### Step 3 — Tergantung opsi

- **Manual:** langsung `cv.create({ templateId })` → `router.push('/builder/[id]')`. Step 3 hanya loading state.
- **Import:** dropzone menerima **PDF & DOCX** (max 5MB) + tab **"Paste teks"** (textarea). Ekstraksi teks di browser:
  - PDF → `pdfjs-dist` (dynamic import), gabung teks per halaman
  - DOCX → `mammoth` (dynamic import) → raw text
  - Paste → langsung
  - Teks (dipotong client-side max ~15.000 karakter) → tRPC `ai.importCv` → hasil parsed → `cv.create({ ...parsed, templateId })` → `/builder/[id]`.
  - Progress state berurutan: "Membaca file…" → "Menganalisis CV dengan AI…" → "Menyiapkan builder…"

## Backend — `ai.importCv`

Procedure baru di `features/ai/server/ai-router.ts`, mengikuti pola `ai.generate`:

- Input: `{ text: string }` (Zod, max 15.000 karakter).
- `checkRateLimit` (Upstash) + `consumeAiQuota` — **mengonsumsi 1 quota AI bulanan**.
- Prompt: parse teks CV mentah → JSON sesuai `cvContentSchema.partial()`; ekstrak semua section yang terdeteksi: `personal`, `summary`, `experience`, `education`, `skills`, `languages`, `certifications`, `interpersonal`, `organizations`, `projects`, `custom`.
- JSON mode, model `DEFAULT_MODEL`, validasi hasil dengan `cvContentSchema.partial().safeParse`.

### Perluasan `cv.create`

`cv.create` di `features/cv/server/cv-router.ts` saat ini hanya menyimpan `personal/summary/experience/education/skills/projects` dari input. Diperluas agar juga menerima `languages`, `certifications`, `interpersonal`, `organizations`, `custom` supaya hasil import tidak hilang. Gating yang sudah ada (`assertCvSlot`, premium template check) tetap berjalan tanpa perubahan.

## Error Handling

- Quota AI habis / limit CV tercapai → tampilkan pesan error dari server (copy upsell Indonesia sudah ada) + link ke `/dashboard/billing`.
- PDF hasil scan / ekstraksi teks kosong → "Tidak bisa membaca teks dari file ini. Coba paste teks CV kamu langsung." → arahkan ke tab paste.
- AI gagal parse (JSON invalid setelah retry safeParse gagal) → error + tombol "Coba lagi"; quota yang terlanjur terpakai tidak di-refund (konsisten dengan `ai.generate`).
- File > 5MB atau format selain PDF/DOCX → ditolak di client sebelum ekstraksi.

## Struktur File

```
features/onboarding/
  components/
    onboarding-wizard.tsx      # stepper + state wizard
    step-choose-method.tsx     # step 1: manual / import + link AI
    step-choose-template.tsx   # step 2: grid template
    step-import-cv.tsx         # step 3 import: dropzone + paste + progress
  lib/
    extract-text.ts            # pdfjs-dist + mammoth dynamic imports
app/(dashboard)/onboarding/page.tsx
```

Dependency baru: `pdfjs-dist`, `mammoth`.

## Testing

- Unit test untuk `ai.importCv` (prompt output validation, quota consumption path) mengikuti pola `features/billing/server/entitlements.test.ts`.
- Sisanya manual smoke test: manual flow, import PDF, import DOCX, paste teks, skip, redirect loop, quota habis, limit CV.

## Out of Scope

- Parsing di server / infra upload file baru (UploadThing route untuk dokumen).
- Refund quota saat AI gagal.
- Perubahan pada AI generator (`AiGeneratorModal`) selain dipanggil dari onboarding.
- Onboarding untuk user yang sudah punya CV.
