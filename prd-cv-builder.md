# PRD: Aplikasi Pembuat CV

## 1. Ikhtisar
Aplikasi Pembuat CV adalah platform pembuatan CV berbasis web yang intuitif dan dipandu langkah demi langkah. Ini memungkinkan pengguna untuk membuat dokumen profesional berkualitas tinggi dalam hitungan menit, tanpa memerlukan keahlian desain. Aplikasi ini menawarkan templat yang dapat disesuaikan, saran yang didukung AI, dan ekspor langsung ke format yang umum digunakan oleh sistem pelacakan pelamar (ATS). Aplikasi ini melayani pelajar yang baru lulus, profesional yang bekerja lepas, dan pekerja yang ingin berganti pekerjaan yang membutuhkan pembaruan CV yang cepat dan konsisten.

## 2. Tujuan & Sasaran
| # | Tujuan | Sasaran |
|---|-----------|----------------|
| 1 | Menyediakan pengalaman pembuatan CV yang lancar dan bebas hambatan | ≤ 5 menit untuk menyelesaikan CV lengkap di semua perangkat |
| 2 | Meningkatkan kualitas CV | ≥ 80% pengguna melaporkan bahwa CV mereka terlihat lebih profesional (penilaian NPS) |
| 3 | Meningkatkan tingkat penggunaan kembali dan berbagi | 60% pengguna menyimpan satu basis CV dan memperbaruinya untuk setiap lamaran |
| 4 | Memastikan kompatibilitas ATS | Output yang dihasilkan sesuai dengan semua parser ATS utama (Green, ATS-friendly) |
| 5 | Mendorong pertumbuhan dan retensi | Mencapai 100.000 pengguna aktif dalam 12 bulan; tingkat retensi bulanan ≥ 70% |

## 3. Target Pengguna & Persona

| Persona | Latar Belakang | Masalah Utama | Manfaat yang Diharapkan |
|---------|----------------|-----------|------------------|
| **Sarjana Fresh Graduate** | Siswa baru lulus yang mencari pekerjaan pertama mereka | Tidak memiliki pengalaman profesional; format CV tidak diketahui | Pembuatan CV yang cepat dan ramah ATS |
| **Pengembang Lepas** | Profesional kreatif (desainer, penulis, pengembang) yang sering menggunakan berbagai proyek | Perlu menyertakan portofolio, mengganti judul proyek dengan cepat | Templat terintegrasi + ekspor portofolio |
| **Manager Junior** | Profesional dengan 0-3 tahun pengalaman yang ingin berganti pekerjaan | CV lama berbasis teks; perlu pergeseran ke CV berbasis keterampilan | UI seret-dan-lepas, saran AI |
| **Tenaga Penjualan Lepas** | Penjual yang menyimpan basis prospek | Pembaruan manual yang memakan waktu, distribusi yang tidak konsisten | Basis data CV yang dapat diperbarui + pengiriman email massal |

## 4. Masalah yang Dipecahkan

- **Keterpurukan Pemula** – Pengguna merasa bingung saat memulai; PRD mengatasi hal ini dengan wizard langkah demi-langkah, petunjuk kontekstual, dan saran berbasis AI.
- **Templat Kaku** – Koleksi templat yang dapat disesuaikan yang mencakup berbagai industri dan format (kronologis, fungsional, hybrid).
- **Kesalahan Manual** – Validasi waktu nyata dan pemeriksaan tata bahasa/makna yang didukung AI mengurangi kesalahan ketik dan entri data yang hilang.
- **Opsi Berbagi Terbatas** – Untuk setiap CV, buat link berbagi yang dapat diedit, ekspor ke PDF/DOCX, dan kirimkan langsung ke portal perekrutan ATS.

## 5. Use Cases / Cerita Pengguna

1. **Indra, Sarjana Terbaru**
   - *Cerita*: Membutuhkan CV untuk melamar beasiswa.
   - *Tindakan*: Mengisi wizard → menambahkan pengalaman akademik, magang, dan kegiatan ekstrakurikuler. AI menyarankan frasa tepat dan format.
   - *Hasil*: Mengekspor ke PDF → diterima setelah 2 minggu.

2. **Mira, Desainer Grafis Lepas**
   - *Cerita*: Membutuhkan CV kreatif yang menyertakan lembar portofolio.
   - *Tindakan*: Memilih templat "visual" → menambahkan proyek, gambar, dan "highlight" seni. Komponen portofolio yang dapat disematkan dibuat secara otomatis.
   - *Hasil*: Mengirimkan paket PDF ke klien; menerima proyek dalam 1 minggu.

3. **Rahul, Manajer Junior**
   - *Cerita*: Ingin mengubah CV berbasis teks lama menjadi CV berbasis keterampilan yang modern.
   - *Tindakan*: Menggunakan "Ubah CV" → Impor teks → AI secara otomatis memetakan ke bagian "Keterampilan", menambahkan bagian "Proyek". Mengatur ulang tata letak.
   - *Hasil*: Mengoptimalkan tata letak, berhasil mendapatkan wawancara.

4. **Jenny, Tenaga Penjualan Lepas**
   - *Cerita*: Memelihara 50+ CV prospek yang disesuaikan.
   - *Tindakan*: Menyimpan satu basis data "CV Utama". Untuk setiap prospek, menyalin parameternya, menyesuaikan bagian yang relevan, lalu menggunakan "Kirim" untuk membuat templat email dengan CV yang dilampirkan (PDF).
   - *Hasil*: Mengirimkan 15+ lamaran per hari dengan tingkat konversi yang meningkat.

## 6. Fitur Utama (MVP)

| Fitur | Prioritas | Deskripsi |
|---------|----------|-------------|
| Wizard Penulisan Berbasis Langkah | **Tinggi** | Panduan bertahap dengan formulir validasi, pratinjau waktu nyata, dan navigasi chevron. |
| Templat yang Dapat Disesuaikan | **Tinggi** | 5 templat dasar (kronologis, fungsional, hybrid, kreatif, minimal) yang dapat disesuaikan melalui editor CSS-in-JS. |
| Saran & Penyuntingan yang Didukung AI | **Tinggi** | AI menyarankan deskripsi pekerjaan, poin pencapaian, dan frasa dengan kekuatan kata kerja. |
| Validasi Real-time & Penyuntingan Offline | **Sedang** | Simpan data di lokal, sinkronkan melalui IndexedDB saat online. |
| Validasi ATS & Ekspor | **Tinggi** | Ekspor ke PDF/DOCX yang berlaku ATS; pratinjau skor "Pasokan ATS". |
| Berbagi & Distribusi | **Sedang** | Buat link bersama yang dapat diedit (token aman), opsi kirim langsung melalui email. |
| Basis Data CV yang Dapat Diperbarui Pengguna | **Tinggi** | Simpan satu atau lebih CV per akun, gunakan templat untuk pembuatan cepat. |
| Login/Masuk SSO | **Tinggi** | Mendukung email/password, Google, GitHub; perlindungan akun. |

## 7. Fitur Lanjutan (Post-MVP)

- **Layanan AI Percakapan**: Chatbot yang merespons kueri CV, memberikan saran secara kontekstual.
- **Analitik ATS**: Riwayat peta panas untuk melihat bagian mana yang "berhasil" terhadap ATS.
- **Integrasi API Perekrutan**: Sinkronkan profil LinkedIn, Parse.com, atau layanan parsing resume.
- **Layanan Berbasis Langganan**: Templat premium, analisis mendalam, atau opsi merek.
- **Mode Kolaborasi**: Beberapa editor untuk tim HR yang bekerja pada CV kandidat yang sama.
- **Aksesibilitas & Terjemahan**: Output yang dapat diakses oleh pembaca layar dan kustomisasi bahasa.

## 8. Arsitektur Teknis

### Frontend
- **Framework**: Next.js 16 (React 19.2) – App Router, Turbopack sebagai default bundler, SSR + Hybrid Rendering untuk optimasi SEO dan performa pemuatan awal halaman.
- **Styling**: Tailwind CSS dengan `postcss` (utility-first); komponen UI statis yang dapat digunakan kembali menggunakan `headless-ui` dan `typescript`.
- **State Management**: React Context API + `Zustand` untuk status UI global (misalnya, status wizard).
- **Validasi**: `Zod` schema + React Hook Form untuk validasi instan.
- **Dukungan Offline**: IndexedDB (leveraged by `Dexie.js`) untuk caching lokal sementara status wizard.

> Catatan migrasi: kalau sebelumnya sempat scaffold pakai Next.js 14, jalankan `npx @next/codemod@canary upgrade latest` untuk migrasi otomatis. Perubahan yang perlu diperhatikan di v16: `middleware.js` berganti nama menjadi `proxy.ts`, dan beberapa API request bersifat async (params, searchParams, dsb).

### Backend
- **API Layer**: Next.js API Routes + `trpc` (RPC) untuk pengetikan end-to-end dan caching permintaan. Setiap fitur menempatkan endpoint-nya di folder `api` dan router tRPC di folder `trpc`.
- **Fungsi Server**: Node.js Serverless Function di Vercel untuk autentikasi, validasi, dan proses yang butuh runtime penuh (lihat catatan ekspor PDF di bawah).
- **Autentikasi**: Better Auth (Google, GitHub, email/password) dengan token JWT sesi aman.
- **Middleware**: `proxy.ts` (Next.js 16) untuk pembatasan tingkat rate dan pembersihan header.
- **Middleware**: `proxy.ts` (Next.js 16) untuk pembatasan tingkat rate dan pembersihan header.

### Database
- **Database**: MongoDB Atlas (cluster gratis untuk pengembangan, pembayaran sesuai penggunaan untuk produksi). Skema untuk `User`, `CV`, `Template`, `ResumeVersion`, `ShareLink`.
- **ORM**: `Prisma` (dengan Prisma MongoDB connector) untuk memodelkan skema di sisi server, migrasi, dan type-safe query. Skema didefinisikan di `schema.prisma`, lalu di-generate jadi Prisma Client untuk dipakai di router tRPC. Semua akses database dilakukan lewat backend/tRPC — tidak ada akses langsung dari client ke MongoDB.
- **Caching**: Upstash Redis untuk menyimpan token sesi dan memperbarui cache dengan cepat untuk pertanyaan yang sering diajukan.

### Deployment & Infrastruktur
- **Hosting**: Platform Vercel (GitHub Actions CI/CD). Memberikan Built-in CDN Edge, time-to-first-byte (TTFB) yang rendah.
- **Env**: Variabel environment dipisahkan melalui `vercel env`.
- **Observability**: `PostHog` untuk analytics, session replay, dan pelacakan event.
- **Keamanan**: CSP, header `X-Frame-Options`, strict rate limiting, enkripsi TLS di seluruh lalu lintas.

### Alasan Memilih Tech Stack
- **Next.js + Tailwind** memberikan kecepatan pemuatan halaman dan rendering SSR yang sangat baik—kunci untuk kinerja SEO dan SEO yang lebih baik untuk situs web publik seperti pembuat CV.
- **Next.js + tRPC** menawarkan pembagian pengetikan yang mulus antara server dan client, mempercepat pengembangan dan memastikan pengetikan yang aman untuk antarmuka pengguna yang kompleks dan disempurnai dengan AI.
- **MongoDB Atlas** menyediakan database NoSQL yang fleksibel yang dapat berkembang seiring dengan data yang kompleks, CV yang terstruktur, dan metadata templat bagi pengguna.
- **Prisma** memberikan type-safety end-to-end (selaras dengan tRPC), auto-completion skema, dan migrasi yang lebih terstruktur dibanding query MongoDB native, sekaligus mempermudah onboarding developer baru membaca relasi antar model.
- **Vercel** menyatukan pengembangan front-end React, deployment server-side, dan skalabilitas Edge, mengurangi overhead operasional dan mempercepat siklus iterasi.

## 9. Skema Data (high-level)

```json
{
  "User": {
    "uid": "string (autoincrement/berdasarkan JWT)",
    "email": "string (unique)",
    "name": "string",
    "image": "string (optional)",
    "plan": "free|pro",
    "createdAt": "Date"
  },
  "Template": {
    "id": "string",
    "name": "string",
    "category": "chronological|functional|creative|minimal",
    "structure": "bson (JSON schema)",
    "isPremium": "boolean"
  },
  "CV": {
    "id": "string",
    "userId": "ref User",
    "templateId": "ref Template",
    "title": "string",
    "sections": {
      "personal": {
        "fullName": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "linkedin": "string (optional)",
        "portfolioUrl": "string (optional)"
      },
      "summary": {
        "text": "string"
      },
      "experience": [
        {
          "id": "string",
          "company": "string",
          "role": "string",
          "startDate": "Date",
          "endDate": "Date | null (null = masih bekerja)",
          "location": "string (optional)",
          "highlights": ["string"]
        }
      ],
      "education": [
        {
          "id": "string",
          "institution": "string",
          "degree": "string",
          "fieldOfStudy": "string",
          "startDate": "Date",
          "endDate": "Date | null",
          "gpa": "number (optional)"
        }
      ],
      "skills": [
        {
          "category": "string",
          "items": ["string"]
        }
      ],
      "projects": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "url": "string (optional)",
          "techStack": ["string"]
        }
      ]
    },
    "aiSuggestionsEnabled": "boolean",
    "lastModified": "Date",
    "versions": ["ref CVVersion"]
  },
  "CVVersion": {
    "id": "string",
    "cvId": "ref CV",
    "contentSnapshot": "bson",
    "createdAt": "Date"
  },
  "ShareLink": {
    "id": "string",
    "cvId": "ref CV",
    "token": "string (secure random)",
    "expiresAt": "Date",
    "editable": "boolean"
  }
}
```

## 10. API & Integrasi Eksternal

| Endpoint | Metode | Deskripsi |
|----------|--------|-------------|
| `/api/auth/signin` | POST | Otentikasi email/password, Google, GitHub (Better Auth) |
| `/api/cv` | POST | Buat CV baru |
| `/api/cv/{id}` | GET/PUT | Ambil/perbarui metadata dan bagian CV |
| `/api/cv/{id}/section/{sectionKey}` | PATCH | Pembaruan bagian real-time |
| `/api/cv/{id}/ai/suggest` | POST | Generate saran yang didukung AI (menggunakan OpenAI/Anthropic) |
| `/api/cv/{id}/export` | POST | Mulai pembuatan PDF/DOCX (lihat catatan implementasi ekspor) |
| `/api/share/{token}` | GET | Tampilkan pratinjau CV yang dapat diedit atau tidak dapat diedit |
| `/api/webhook/resume-submitted` | POST | Menerima pengiriman webhook dari portal perekrutan eksternal (misalnya, ATS) |
| `/api/integration/linkedin` | GET | Otorisasi OAuth untuk LinkedIn, lalu sinkronkan profil |

> Catatan implementasi ekspor PDF: Puppeteer tidak berjalan di Vercel Edge Runtime karena butuh binary Chromium headless penuh. Gunakan Node.js Serverless Function dengan `puppeteer-core` + `@sparticuz/chromium`, atau servis eksternal (mis. Browserless, PDFShift) sebagai alternatif yang lebih ringan dikelola.

## 11. Metrik Sukses (KPI)

| Metrik | Target | Cara Mengukur |
|--------|--------|----------------|
| Waktu Pengerjaan CV | ≤ 5 menit | Lacak langkah demi langkah waktu ke waktu |
| Skor Konversi ATS | ≥ 80% (green) | Pratinjau yang diinstal ke pengguna |
| Retensi Pengguna Bulanan | ≥ 70% | Hitung pengguna aktif yang kembali |
| Volume Penggunaan Saran AI | ≥ 60% pembuatan CV | Melacak panggilan API untuk AI |
| Volume Penggunaan Berbagi/Link | ≥ 30% CV | Hitung jumlah link yang dibagikan |
| Distribusi Persona Pengguna | Setiap persona (4 jenis) terwakili ≥ 5% dari total user aktif | Survei onboarding / self-identifikasi pengguna |
| Kecepatan Pemecahan Bug | Mean Time to Resolution < 48 jam | Pelacakan internal |
| Tingkat Penjualan Jasa Premium | ≥ 20% pengguna aktif | Pelacakan faktur |
| Kesadaran Pengguna | 100 ribu pengguna aktif dalam 12 bulan | Dashboard analitik |

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|------|--------|------------|
| **Error AI** (masukan/frasa yang tidak tepat) | Pengguna kehilangan kepercayaan | Terapkan fallback (AI) dan tingkat validasi manual; filter konten melalui moderator |
| **Penurunan Kompatibilitas ATS** | Output ditolak | Implementasikan daftar periksa kompatibilitas yang dapat diperbarui; peluncuran versi parser yang fleksibel |
| **Keamanan Data Pengguna** | Pelanggaran data, kehilangan informasi sensitif | Enkripsi untuk data sensitif, gunakan header keamanan yang kuat, otorisasi JWT, audit SOC2 |
| **Tingkat Retensi Pengguna Rendah** | Keterlambatan monetisasi | Iterasi UI/UX yang terus-menerus berdasarkan analisis, dorong pendaftaran dan penggunaan kembali melalui email |
| **Beban Server** (bantuan AI yang tiba-tiba) | Waktu muat lambat | Skalakan secara vertikal di Vercel Edge; cache panggilan API yang mahal |
| **Masalah dengan Vendor Eksternal** (OpenAI, LinkedIn) | Biaya tak terduga | Tag biaya untuk setiap penggunaan; integrasikan dengan endpoint cadangan |
| **Kepatuhan Hukum** (UU PDP Indonesia, GDPR, CCPA) | Denda, penurunan reputasi | Terapkan kebijakan penyimpanan dan retensi data, tambahkan kebijakan persetujuan (consent) yang jelas sesuai UU PDP |

## 13. Roadmap & Milestones (3-6 bulan pertama)

| Bulan | Milestone | Fitur Utama |
|-------|-----------|-------------|
| 1-2 | **Peluncuran MVP (Wizard + Templat)** | Wizard langkah demi langkah, 5 templat dasar, ekspor PDF/DOCX, autentikasi pengguna |
| 3 | **Dukungan AI** | Saran berbasis OpenAI, editor bantu AI untuk poin pencapaian |
| 4 | **Fitur Berbagi & Distribusi** | Buat link bersama, fitur kirim melalui email |
| 5 | **Basis Data CV yang Dapat Diperbarui** | Edit versi, sinkronisasi lokal saat offline |
| 6 | **Stabilitas & Analisis** | Analisis berkualitas, pelaporan error, pembandingan kinerja ATS, potensi peluncuran premium |
| 7-9 | **Integrasi API Eksternal** | LinkedIn, Parse.com, webhook untuk pengiriman ATS |
| 10-12 | **Fitur Lanjutan** | Collab Editor, modul AI percakapan, paket berlangganan premium |

## 14. Asumsi & Out-of-Scope

- **Asumsi**
  - Pengguna memiliki akses internet untuk penyimpanan sinkronisasi dan panggilan API.
  - Sebagian besar organisasi perekrutan menggunakan PDF/DOCX; tingkat dukungan untuk ATS tinggi pada format tersebut.
  - Model AI (OpenAI/Anthropic) dapat diandalkan dengan latensi tipikal ≤ 2 detik per permintaan.

- **Out-of-Scope**
  - Pembuatan CV offline sepenuhnya (diperlukan penyimpanan lokal yang terus-menerus, tapi bukan prioritas).
  - Pembuatan CV video/animasi (fokus pada PDF/DOCX).
  - Integrasi mesin pencari AI untuk optimasi tingkat tinggi (hanya saran).
