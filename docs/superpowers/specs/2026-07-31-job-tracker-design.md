# Pelacak Lamaran (Job Application Tracker) — Design

**Date:** 2026-07-31
**Status:** Approved by user (brainstorming session)

## Goal

Mengganti halaman placeholder `/dashboard/job-tracker` ("Segera Hadir") dengan fitur pelacak lamaran penuh: Kanban board dengan kolom kustom, detail lowongan lengkap, link ke CV, timeline & catatan, reminder follow-up in-app, statistik konversi, export CSV, dan AI follow-up email. Fitur hanya untuk paket **Basic/Pro**; user free melihat upsell view.

## Scope

Termasuk:
- Kanban CRUD lamaran + drag-drop antar kolom
- Kolom kustom (tambah/rename/reorder/hapus) dengan 5 kolom default: Dilamar, Interview, Offer, Diterima, Ditolak
- Detail lowongan: URL, lokasi, tipe kerja (remote/hybrid/onsite), range gaji
- Link opsional ke CV milik user
- Timeline per lamaran (perubahan status otomatis + catatan manual)
- Reminder follow-up **in-app saja** (badge saat `followUpDate` jatuh tempo; tanpa email/cron)
- Stats funnel konversi berbasis `kind` kolom
- Export CSV
- Generate email follow-up via fitur AI yang sudah ada
- Gating Basic/Pro

Tidak termasuk: notifikasi email, kolaborasi, e2e test.

## Architecture

Ikut pola repo: feature module `features/job-tracker/` (components, hooks, lib, schemas, server), tRPC router dimount di `server/trpc/routers/_app.ts` sebagai `jobTracker`, semua akses DB via tRPC, ownership via `userId` string (tanpa relasi Prisma formal ke User).

Pendekatan data: **dua model** — `JobBoard` (satu per user, kolom embedded) + `JobApplication` (dokumen per lamaran). Dipilih dibanding satu-dokumen-embed-semua (bengkak, limit 16MB, stats susah) dan enum-status-saja (tidak mendukung kolom kustom beneran).

## Data Model (Prisma, MongoDB)

```prisma
model JobBoard {
  id        String           @id @default(auto()) @map("_id") @db.ObjectId
  userId    String           @unique  // 1 board per user
  columns   JobBoardColumn[] // embedded
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("job_board")
}

type JobBoardColumn {
  id    String  // cuid dari client
  name  String  // bisa di-rename user
  kind  String  // "applied" | "interview" | "offer" | "accepted" | "rejected" | "custom"
  order Int
}

model JobApplication {
  id           String    @id @default(auto()) @map("_id") @db.ObjectId
  userId       String
  columnId     String    // ref ke JobBoardColumn.id
  order        Int       // posisi dalam kolom
  company      String
  position     String
  jobUrl       String?
  location     String?
  workType     String?   // "remote" | "hybrid" | "onsite"
  salaryMin    Int?
  salaryMax    Int?
  cvId         String?   // ref ke CV milik user (opsional)
  followUpDate DateTime? // reminder in-app
  notes        String?
  timeline     JobTimelineEvent[] // embedded
  appliedAt    DateTime  @default(now())
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([userId])
  @@map("job_application")
}

type JobTimelineEvent {
  id        String
  type      String   // "status_change" | "note"
  fromKind  String?
  toKind    String?
  note      String?
  createdAt DateTime
}
```

Aturan:
- Board dibuat lazy dengan 5 kolom default saat user Basic/Pro pertama membuka halaman (via `getBoard`).
- `kind` menjaga stats valid meski kolom di-rename; kolom `custom` tidak masuk funnel stats.
- Kolom ber-`kind` bawaan tidak bisa dihapus (hanya rename/reorder). Hapus kolom custom memindahkan kartunya ke kolom pertama.
- Timeline dapat event `status_change` otomatis saat pindah kolom dengan `kind` berbeda; catatan manual jadi event `note`.

## Server — tRPC Router

`features/job-tracker/server/job-tracker-router.ts`, mount sebagai `jobTracker`. Semua procedure `protectedProcedure` + helper **`requirePaidPlan`** (cek `Subscription` aktif Basic/Pro; selain itu throw `TRPCError` `FORBIDDEN`).

| Procedure | Fungsi |
|---|---|
| `getBoard` | Board + semua lamaran user; auto-create board default jika belum ada |
| `updateColumns` | Tambah/rename/reorder/hapus kolom (dengan aturan di atas) |
| `createApplication` / `updateApplication` / `deleteApplication` | CRUD, ownership via `userId` match |
| `moveApplication` | `{ id, columnId, order }` drag-drop; append timeline jika `kind` berubah |
| `addNote` | Append timeline event `note` |
| `getStats` | Funnel konversi per `kind` + daftar `followUpDate <= now` |
| `exportCsv` | String CSV semua lamaran (client trigger download) |
| `generateFollowUpEmail` | Pakai infra AI existing (`features/ai`) → draft email follow-up |

Zod schemas di `features/job-tracker/schemas/job-tracker.ts` — single source of truth untuk tRPC input + react-hook-form resolver.

## Frontend

Entry: `app/(dashboard)/dashboard/job-tracker/page.tsx` jadi thin entry point; logika di `features/job-tracker/components/`:

- `job-tracker-page.tsx` — cek plan; user free → **upsell view** (repurpose desain placeholder → CTA upgrade)
- `kanban-board.tsx` — kolom horizontal scrollable; drag-drop pakai **dnd-kit** (dependency baru)
- `application-card.tsx` — perusahaan, posisi, badge lokasi/workType, badge "Perlu follow-up" saat jatuh tempo
- `application-dialog.tsx` — form tambah/edit (react-hook-form + Zod, shadcn); semua field lowongan, pilih CV dari `trpc.cv` list, tanggal follow-up
- `application-detail-sheet.tsx` — detail + timeline + tambah catatan + tombol "Generate email follow-up (AI)" (hasil bisa di-copy)
- `column-header.tsx` — rename inline, hapus (custom only), tambah kolom di ujung board
- `stats-cards.tsx` — total lamaran, funnel per tahap, jumlah perlu follow-up
- Toolbar: Export CSV, tambah lamaran

State: **tanpa Zustand** — TanStack Query (tRPC) + optimistic update untuk move/drag-drop. Kanban itu CRUD murni, beda dengan CV builder yang butuh store untuk autosave draft.

Konvensi: tombol async pakai `Button` `loading`/`loadingText`; bahasa UI Indonesia.

## Error Handling

- `FORBIDDEN` → render upsell view (bukan toast)
- Mutasi gagal → rollback optimistic update + toast error
- `moveApplication` idempotent; `order` int di-rewrite per kolom saat move
- AI gagal/timeout → error di sheet, bisa retry
- Validasi Zod dua sisi (server + form)

## Testing

Pola `features/job-tracker/lib/__tests__/` (seperti features/cv):
- Unit test fungsi murni: reorder/move logic, kalkulasi stats funnel, CSV generation
- Logika router kompleks (updateColumns + relokasi kartu, timeline append) dipecah ke fungsi murni di `lib/` agar teruji tanpa DB
- Tanpa e2e untuk iterasi ini
