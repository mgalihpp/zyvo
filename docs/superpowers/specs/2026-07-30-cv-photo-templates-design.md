# Design Spec: CV Photo Profile + 4 Template Baru

**Date:** 2026-07-30  
**Status:** Approved

---

## Latar Belakang

Saat ini aplikasi cv-maker-ai memiliki 5 template CV (classic, modern, professional, minimal, fresh-graduate), namun **tidak ada satu pun yang mendukung foto profile**. Permintaan ini menambahkan 4 template baru yang menampilkan foto profile, sekaligus membangun infrastruktur upload foto menggunakan UploadThing.

---

## Tujuan

1. Menambahkan field `photo` ke data personal CV sehingga tersimpan di database.
2. Mengintegrasikan UploadThing untuk upload foto profile dari browser.
3. Menambahkan UI upload/preview foto di panel "Informasi Pribadi".
4. Membuat 4 template CV baru yang masing-masing menampilkan foto dengan gaya berbeda.

---

## Non-Goals

- Tidak mengubah atau menambahkan foto ke 5 template yang sudah ada.
- Tidak mendukung crop/edit foto di dalam aplikasi.
- Tidak mendukung multiple foto per CV.

---

## Arsitektur & Pendekatan

### Field Foto (Pendekatan A — field di `personalSchema`)

`photo` ditambahkan sebagai field opsional di `personalSchema` yang sudah ada:

```ts
photo: z.string().max(500).optional().default("")
```

**Alasan:** `personal` sudah di-pass wholesale melalui seluruh stack (schema → store → tRPC router → Prisma → print page). Menambah field di sini otomatis tersimpan ke DB dan ter-render di PDF tanpa perubahan di lapisan lain. Field opsional dengan default `""` memastikan backward-compatibility penuh dengan CV lama.

**Perubahan yang diperlukan:**
- `features/cv/schemas/cv.ts` — tambah field `photo`, update `emptyPersonal`
- `prisma/schema.prisma` — tambah `photo String?` di composite type `Personal`
- Jalankan `bun db:push && bun db:generate`
- Tidak ada perubahan di router, store, atau print page

### UploadThing Integration

- Package: `uploadthing` + `@uploadthing/react`
- File router: `app/api/uploadthing/core.ts`
- Route handler: `app/api/uploadthing/route.ts`
- Middleware guard: cek session Better Auth, tolak jika tidak terautentikasi
- File type: `image`, maxFileSize `2MB`, maxFileCount `1`
- Environment variable: `UPLOADTHING_TOKEN` (dari dashboard UploadThing)

### UI Photo Field

Komponen `features/cv/components/panels/photo-field.tsx`:
- **State kosong:** avatar placeholder abu-abu + tombol upload UploadButton
- **State terisi:** thumbnail bulat 80px + tombol "Ganti" (reupload) + tombol "Hapus"
- `onClientUploadComplete(res)` → `setPersonal({ photo: res[0].ufsUrl })`
- `onHapus` → `setPersonal({ photo: "" })`
- Autosave 800ms berjalan otomatis karena `setPersonal` bump `revision`
- Disisipkan di atas grid field di `personal-form.tsx`

### next.config.ts — Image Domains

Tambahkan `utfs.io` dan `*.ufs.sh` ke `images.remotePatterns` jika diperlukan. Template baru menggunakan `<img>` (bukan `next/image`) agar konsisten dengan Puppeteer PDF export — sehingga konfigurasi ini hanya bersifat opsional/preventif.

---

## 4 Template Baru

Semua template:
- Menerima `cv: CvContent` (sama seperti template lain)
- Membaca `cv.personal.photo` dan **render secara kondisional** — bila kosong, layout tetap rapi
- Menggunakan `<img src={p.photo} className="object-cover" />` (bukan next/image)
- Mengikuti CSS variable pattern: `--cv-color-*` dan `--cv-font-*`
- Target A4: `max-w-[794px] min-h-[1123px]`
- Mendukung `print:[print-color-adjust:exact]`

### Template 1: `executive`
- **Nama:** Executive  
- **Layout:** Single column, header band penuh lebar di bagian atas  
- **Foto:** Bulat (80×80px), float kanan di dalam header, border accent  
- **Gaya:** Formal, dark navy/charcoal, serif font, divider tipis antar section  
- **Default colors:** `heading: #1a1a2e`, `accent: #16213e`, `text: #2d2d2d`
- **Default fonts:** `fontHeading: "source-serif"`, `fontBody: "source-serif"`
- **Kategori:** `["professional", "one-column", "new"]`

### Template 2: `creative`
- **Nama:** Creative  
- **Layout:** Dua kolom — sidebar kiri 40% + main kanan  
- **Foto:** Persegi dengan border-radius 8px, 100×100px, di bagian atas sidebar  
- **Gaya:** Bold accent kuat, modern, cocok untuk desainer/kreator  
- **Default colors:** `heading: #1f1d2b`, `accent: #6c63ff`, `text: #3d3d3d`
- **Default fonts:** `fontHeading: "inter"`, `fontBody: "inter"`
- **Kategori:** `["creative", "two-column", "new"]`

### Template 3: `elegant`
- **Nama:** Elegant  
- **Layout:** Single column, header centered  
- **Foto:** Bulat besar (96×96px), di tengah atas nama, border accent tipis  
- **Gaya:** Tipografi premium, serif, warna lembut pastel, whitespace generous  
- **Default colors:** `heading: #4a3728`, `accent: #c9956c`, `text: #5a5a5a`
- **Default fonts:** `fontHeading: "lora"`, `fontBody: "lora"`
- **Kategori:** `["professional", "one-column", "new"]`

### Template 4: `compact`
- **Nama:** Compact  
- **Layout:** Dua kolom padat — kolom kiri 35% untuk kontak+skills, kolom kanan main  
- **Foto:** Kecil square 64×64px, pojok kiri atas header section  
- **Gaya:** Dense, maximalis konten, cocok CV yang panjang  
- **Default colors:** `heading: #0d3b66`, `accent: #0d3b66`, `text: #333333`
- **Default fonts:** `fontHeading: "roboto"`, `fontBody: "roboto"`
- **Kategori:** `["professional", "two-column", "ats"]`

---

## Alur Data End-to-End

```
User klik Upload → UploadThing API → CDN URL
  → onClientUploadComplete → setPersonal({ photo: url })
  → revision++ → autosave debounce 800ms
  → trpc.cv.update({ personal: { ...personal, photo: url } })
  → Prisma CV.update({ personal: { photo: url } })

Render live preview:
  → cv.personal.photo → template <img src={photo} />

PDF export:
  → GET /api/cv/[cvId]/export
  → Puppeteer navigate /builder/[cvId]/print
  → print/page.tsx: getEagerTemplate(templateId)
  → <Template cv={content} /> (eager, fully rendered)
  → photo URL di-fetch Puppeteer saat render halaman
```

---

## File yang Diubah / Dibuat

| File | Status | Keterangan |
|---|---|---|
| `features/cv/schemas/cv.ts` | Modify | Tambah `photo` ke personalSchema + emptyPersonal |
| `prisma/schema.prisma` | Modify | Tambah `photo String?` di type Personal |
| `app/api/uploadthing/core.ts` | Create | File router UploadThing |
| `app/api/uploadthing/route.ts` | Create | Route handler GET+POST |
| `features/cv/lib/uploadthing.ts` | Create | generateUploadButton/Dropzone type-safe |
| `features/cv/components/panels/photo-field.tsx` | Create | UI upload+preview foto |
| `features/cv/components/panels/personal-form.tsx` | Modify | Sisipkan PhotoField di atas grid |
| `features/cv/components/templates/executive.tsx` | Create | Template Executive |
| `features/cv/components/templates/creative.tsx` | Create | Template Creative |
| `features/cv/components/templates/elegant.tsx` | Create | Template Elegant |
| `features/cv/components/templates/compact.tsx` | Create | Template Compact |
| `features/cv/components/templates/index.ts` | Modify | Daftarkan 4 template lazy |
| `features/cv/components/templates/eager.ts` | Modify | Daftarkan 4 template eager |
| `features/cv/components/templates/template-colors.ts` | Modify | Default colors+fonts 4 template |
| `next.config.ts` | Modify | Tambah utfs.io ke remotePatterns (opsional) |

---

## Constraints

- Gunakan `bun` (bukan npm/yarn) untuk semua perintah
- Tailwind v4 (`@theme`, bukan `@apply`)
- Foto dirender dengan `<img>` biasa, bukan `next/image`, agar Puppeteer kompatibel
- Template mengikuti pola `TemplateProps` dari `shared.tsx`
- `UPLOADTHING_TOKEN` harus diisi di `.env` sebelum upload bisa berjalan
- `bun lint` dan `bun build` harus lulus setelah implementasi

---

## Verifikasi

1. `bun lint` — tidak ada error Biome
2. `bun build` — build berhasil
3. Manual: upload foto → cek live preview di 4 template baru
4. Manual: export PDF dari tiap template baru, verifikasi foto muncul
5. Manual: buka CV lama (tanpa foto) → semua template lama dan baru tetap render dengan baik
6. Manual: hapus foto → layout kembali rapi tanpa foto
