# Onboarding AI: Form Lengkap Multi-langkah + AI Tulis Teks

Tanggal: 2026-08-01
Status: Disetujui

## Masalah

Alur onboarding "Buat dengan AI" (`features/onboarding/components/step-ai-generator.tsx`)
hanya mengumpulkan 3 field: nama, bidang, ringkasan opsional. Dengan input seminimal itu,
AI (`features/ai/server/prompts/generator.ts`) diminta menyusun draft CV lengkap. Hasilnya:

- **Halu**: AI mengarang fakta yang tidak pernah diberikan user (email, telepon, riwayat
  kerja, pendidikan, skill) → CV tidak sesuai user.
- **Kurang lengkap**: atau AI mengosongkan banyak field → draft tipis.

## Tujuan

- User mengisi semua fakta CV lewat form multi-langkah → AI tidak perlu menebak fakta.
- AI hanya menulis teks prosa (ringkasan, deskripsi) dari fakta yang user berikan.
- Tidak ada halu: fakta yang tidak diberikan user tetap kosong, tidak diarang.

## Solusi

### 1. Form multi-langkah baru (`StepAiForm`)

Menggantikan `StepAiGenerator` (3 field) pada step AI onboarding. 5 langkah:

1. **Data pribadi** — nama (wajib), headline, email, telepon, lokasi, website, linkedin, github
2. **Pengalaman** — repeater: perusahaan, posisi, lokasi, periode (start/end), checkbox
   "masih bekerja" (`current`), deskripsi opsional
3. **Pendidikan** — repeater: sekolah, gelar, jurusan, periode, IPK
4. **Skill + interpersonal** — input berbentuk tags
5. **Proyek + sertifikasi + bahasa + organisasi** — repeater masing-masing

Tombol akhir: "Buat CV". Alur: bangun `CvContent` dari state form → panggil
`trpc.ai.enrich` → gabung field teks → `trpc.cv.create` → redirect ke builder.

Pola input mengikuti komponen builder yang ada (`personal-form.tsx`, `editor-dialog.tsx`)
agar konsisten.

### 2. AI tulis teks saja, anti-halu

Mutation baru `trpc.ai.enrich` ditambahkan. `ai.generate` DI-PERTAHANKAN — masih
dipakai `AiGeneratorModal` (F5 smart generator di builder) dan `generator.ts`
tetap hidup.

- **Input**: fakta lengkap — validasi dengan `cvContentSchema.partial()` (tanpa
  templateId/typography/colors).
- **Output**: HANYA field teks:
  - `summary`
  - `headline`
  - `experience[].description`
  - `project[].description`
  - `organization[].description`
  - `certification[].description`
- **Prompt** (`features/ai/server/prompts/enricher.ts`):
  - Tulis prosa hanya dari fakta yang ada di input.
  - Fakta kosong → teks kosong.
  - Dilarang mengarang nama, perusahaan, sekolah, tanggal, email, telepon, skill, angka.
  - Balas HANYA JSON sesuai struktur output.
- `max_tokens` cukup kecil (~1000), model `DEFAULT_MODEL_MINI`.
- **Overwrite**: enrich hanya mengisi field teks yang KOSONG di input user. Jika user
  sudah menulis deskripsi, teks user dipertahankan, tidak ditimpa.

### 3. Ketahanan

AI adalah penyempurna opsional, bukan prasyarat:

- Jika `ai.enrich` gagal (timeout/error/quota habis) → tetap buat CV dari data user.
- Tidak ada data fakta yang hilang; hanya field teks yang bisa kosong.

### 4. Validasi

- Input enrich divalidasi Zod (`cvContentSchema.partial()`).
- Output enrich divalidasi schema teks (string, max length).
- Form: nama wajib (mengikuti rule `canSubmit` saat ini).

## File yang berubah

- `features/onboarding/components/step-ai-generator.tsx` — diganti `StepAiForm` (form
  multi-langkah).
- `features/onboarding/components/onboarding-wizard.tsx` — alur generate pakai enrich.
- `features/ai/server/ai-router.ts` — tambah `enrich` (jangan hapus `generate`).
- `features/ai/server/prompts/enricher.ts` — prompt baru (baru, bukan pengganti `generator.ts`).
- `features/ai/lib/rate-limit.ts` — reuse key `ai:generate` untuk `ai.enrich` (batas 5/jam).

## Non-goals

- Tidak menambah bagian CV baru di schema.
- Tidak menyentuh alur import CV / manual.
- Tidak menyentuh fitur AI lain (improve, chat, score, dll).
