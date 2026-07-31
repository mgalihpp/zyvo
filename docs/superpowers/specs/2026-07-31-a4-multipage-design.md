# A4 Multi-Halaman — Design

Tanggal: 2026-07-31
Status: Disetujui

## Masalah

CV yang kontennya melebihi satu halaman saat ini diexport sebagai **satu halaman panjang** (bukan beberapa halaman A4). Penyebab: `features/cv/lib/pdf.ts` mengukur tinggi konten, set `height` PDF = tinggi konten, dan memaksa `pageRanges: "1"`. Hasilnya poster panjang, bukan 2+ halaman A4.

Ukuran template sebenarnya sudah A4 (794×1123px @96dpi). Yang kurang: export multi-halaman, visualisasi batas halaman di preview, dan konsistensi antar template.

## Solusi

### 1. PDF export multi-halaman A4 (`features/cv/lib/pdf.ts`)

- Hapus pengukuran tinggi konten dan `pageRanges: "1"`.
- Export PDF pakai ukuran A4 eksplisit:

```unknown
page.pdf({
  width: "210mm",
  height: "297mm",
  printBackground: true,
  preferCSSPageSize: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
})
```

- Chromium melakukan pagination otomatis. Aturan break di `app/globals.css` (`[data-entry] { break-inside: avoid }`, heading `break-after: avoid`, `section { break-before: avoid }`) sudah siap dan sekarang benar-benar dipakai.
- PNG (fullPage screenshot) tidak berubah: tetap satu gambar panjang.

### 2. Preview: garis batas halaman presisi (`features/cv/components/cv-preview.tsx` + hook baru)

Hook `useCvPageBreaks` (file baru: `features/cv/hooks/use-cv-page-breaks.ts`):

- Berjalan di `useLayoutEffect` setelah render, menunggu `document.fonts.ready`, dan di-rAF-throttle saat konten berubah (subscribe ke store).
- Pengukuran:
  - Ambil elemen `section` dan `[data-entry]` di dalam artikel (querySelectorAll pada wrapper artikel).
  - Elemen yang punya ancestor multi-kolom horizontal (deteksi via `getComputedStyle`: `gridTemplateColumns` > 1 kolom atau `flexDirection: row`) dianggap atomik — break-nya jatuh di kelipatan tinggi halaman (1123px), karena container multi-kolom selalu mengisi halaman penuh (min-h).
  - Simulasi greedy: tinggi halaman = 1123px. Walk urutan dokumen, potong hanya di "safe cut" (top section / top entry non-pertama dalam section). Elemen yang melampaui batas halaman dipindah utuh ke halaman berikutnya.
  - Output: array posisi break (y relatif ke top artikel) + total halaman.
- Render: garis putus-putus + label "Hal N" (untuk halaman 2 dst), diposisikan absolute di dalam wrapper yang sama dengan CSS `zoom` → ikut skala preview.
- CV pendek (≤ 1 halaman): tanpa garis.

Pengukuran generik berbasis `data-entry` → otomatis berlaku untuk template apa pun.

### 3. Konsistensi template

- **Wrapper `CvPage`** baru di `features/cv/components/templates/` (di `shared.tsx`): komponen `<article>` dengan kelas A4 standar:
  `mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]` + terima `className` untuk gaya khusus template.
  - 9 template pindah ke `<CvPage>` → hapus duplikasi dimensi.
  - Template grid (`print:grid-cols-[...]`, `print:grid-rows-[1fr]`) tetap kirim kelas grid via className.
- **`data-entry`**: tambahkan ke wrapper entri di compact, creative, executive, elegant, minimal (classic, modern, professional, fresh-graduate sudah punya). Memastikan `break-inside: avoid` dan pengukuran preview berfungsi di semua template.
- **Sidebar lanjut ke halaman berikut** (modern & creative): pindahkan bg accent dari `<aside>` menjadi background-gradient band pada `<article>` (`linear-gradient(to right, accent W%, white W%)`, W = 34% modern / 40% creative). Background container selalu terpaginasi per fragmen → warna sidebar pasti lanjut ke halaman 2, 3, … terlepas dari perilaku fragmentasi grid. `<aside>` jadi transparan. Teks `--cv-color-on-accent` tetap di aside.

### 4. Template yang akan datang

Konvensi didokumentasikan sebagai komentar di `shared.tsx`:
- Template baru wajib membungkus root dengan `<CvPage>`.
- Wrapper entri (experience/project/cert/organization/custom item) wajib `data-entry`.
- Maka A4 + pagination + garis preview otomatis bekerja tanpa kode tambahan.

## Pertimbangan & risiko

- Fragmentasi grid Chromium untuk sidebar (modern/creative) bisa tidak sempurna. Band-gradient sebagai pengaman warna; konten aside (kontak, skill) diharapkan ikut terfragmentasi. Verifikasi dengan export nyata saat implementasi; jika konten aside terpotong di halaman 2, evaluasi ulang struktur (fallback: batasi sidebar ke halaman 1).
- Posisi break preview dihitung ulang pada setiap perubahan konten; CV berukuran kecil, layout pass ringan. rAF-throttle menjaga performa saat mengetik.
- Deviasi kecil posisi garis preview vs break PDF mungkin terjadi di kasus tepi (widows/orphans teks dalam satu entry); dominan tepat karena entry dijaga utuh.

## Verifikasi

1. Export CV panjang (≥ 2 halaman) ke PDF: jumlah halaman benar, tidak ada entri terpotong di tengah, heading menempel ke section.
2. Semua 9 template: CV pendek = 1 halaman, CV panjang = multi-halaman, sidebar modern/creative punya warna di halaman 2.
3. Preview menampilkan garis batas + label halaman di posisi yang sesuai.
4. `bun lint` dan `bun build` lolos.

## Di luar lingkup

- Nomor halaman di dalam PDF (tidak diminta).
- PNG per-halaman (tetap satu gambar).
