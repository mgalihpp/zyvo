# Pelacak Lamaran (Job Application Tracker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti placeholder `/dashboard/job-tracker` dengan Kanban tracker lamaran penuh (kolom kustom, detail lowongan, link CV, timeline, reminder in-app, stats, CSV, AI follow-up), gated untuk Basic/Pro.

**Architecture:** Feature module `features/job-tracker/` mengikuti pola `features/cv`: Zod schemas sebagai single source of truth, logika murni di `lib/` (unit-tested), tRPC router di `server/`, komponen React di `components/`. Data: model `JobBoard` (1/user, kolom embedded) + `JobApplication` (dokumen per lamaran). State frontend murni TanStack Query + optimistic updates (tanpa Zustand).

**Tech Stack:** Next.js 16 App Router, React 19 (React Compiler), tRPC v11, Prisma+MongoDB, Better Auth (userId string), Zod v4, dnd-kit (sudah terinstall), shadcn/ui, OpenRouter via `features/ai/lib/openrouter`, `node:test` via `bun test <file>`.

**Spec:** `docs/superpowers/specs/2026-07-31-job-tracker-design.md`

## Global Constraints

- Bahasa UI: Indonesia (error message server juga Indonesia, pola `"Gagal ..."`).
- Tombol async WAJIB pakai `Button` props `loading` / `loadingText` (komponen shadcn repo ini mendukungnya).
- Semua akses DB via tRPC; ownership via `userId === ctx.session.user.id` (tanpa relasi Prisma ke User).
- Fitur gated Basic/Pro: setiap procedure jobTracker (kecuali tidak ada pengecualian) lewat `requirePaidPlan`.
- Zod schemas di `features/job-tracker/schemas/job-tracker.ts` dipakai server DAN form resolver.
- Lint: `bun lint` (Biome). Format import otomatis oleh Biome — jalankan `bun format` bila perlu.
- Test: `bun test <path>` dengan `node:test` + `node:assert` (lihat `features/cv/lib/__tests__/typography.test.ts`).
- Path alias `@/*` = root repo.
- 5 kolom default: Dilamar (applied), Interview (interview), Offer (offer), Diterima (accepted), Ditolak (rejected). Kolom ber-kind bawaan tidak bisa dihapus; kolom `custom` bisa.

---

### Task 1: Prisma schema — JobBoard & JobApplication

**Files:**
- Modify: `prisma/schema.prisma` (append di akhir file)

**Interfaces:**
- Produces: model Prisma `JobBoard` (client: `ctx.prisma.jobBoard`), `JobApplication` (client: `ctx.prisma.jobApplication`), composite types `JobBoardColumn`, `JobTimelineEvent`. Field names persis seperti di bawah — dipakai semua task server.

- [ ] **Step 1: Tambah model di `prisma/schema.prisma`**

```prisma
// ── Job tracker ─────────────────────────────────────────────────────────────
// One board per user. Columns are embedded; applications are separate docs so
// the board doc stays small and applications remain queryable.

model JobBoard {
  id        String           @id @default(auto()) @map("_id") @db.ObjectId
  userId    String           @unique
  columns   JobBoardColumn[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  @@map("job_board")
}

type JobBoardColumn {
  id    String // client-generated id
  name  String // user-renamable label
  kind  String // "applied" | "interview" | "offer" | "accepted" | "rejected" | "custom"
  order Int
}

model JobApplication {
  id           String             @id @default(auto()) @map("_id") @db.ObjectId
  userId       String
  columnId     String // JobBoardColumn.id
  order        Int // position within column
  company      String
  position     String
  jobUrl       String?
  location     String?
  workType     String? // "remote" | "hybrid" | "onsite"
  salaryMin    Int?
  salaryMax    Int?
  cvId         String? // optional ref to owned CV
  followUpDate DateTime?
  notes        String?
  timeline     JobTimelineEvent[]
  appliedAt    DateTime           @default(now())
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@index([userId])
  @@map("job_application")
}

type JobTimelineEvent {
  id        String
  type      String // "status_change" | "note"
  fromKind  String?
  toKind    String?
  note      String?
  createdAt DateTime
}
```

- [ ] **Step 2: Push & generate**

Run: `bun db:push` lalu `bun db:generate`
Expected: sukses tanpa error; Prisma Client punya `jobBoard` & `jobApplication`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add JobBoard and JobApplication models"
```

---

### Task 2: Zod schemas + default columns

**Files:**
- Create: `features/job-tracker/schemas/job-tracker.ts`
- Create: `features/job-tracker/lib/default-columns.ts`
- Test: `features/job-tracker/lib/__tests__/schemas.test.ts`

**Interfaces:**
- Produces:
  - `columnKindSchema` (enum), `boardColumnSchema`, `applicationInputSchema`, `applicationUpdateSchema`, `moveApplicationSchema`, `updateColumnsSchema`, `addNoteSchema` — dipakai router (Task 5-6) dan form (Task 9).
  - Types: `BoardColumn = z.infer<typeof boardColumnSchema>`, `ApplicationInput = z.infer<typeof applicationInputSchema>`.
  - `createDefaultColumns(idFactory: () => string): BoardColumn[]` — 5 kolom default berurutan.
  - `PROTECTED_KINDS: readonly string[]` — kinds yang tidak bisa dihapus.

- [ ] **Step 1: Tulis failing test `features/job-tracker/lib/__tests__/schemas.test.ts`**

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import {
  applicationInputSchema,
  boardColumnSchema,
  moveApplicationSchema,
} from "@/features/job-tracker/schemas/job-tracker";

test("createDefaultColumns returns 5 ordered columns with fixed kinds", () => {
  let i = 0;
  const cols = createDefaultColumns(() => `id-${i++}`);
  assert.equal(cols.length, 5);
  assert.deepEqual(
    cols.map((c) => c.kind),
    ["applied", "interview", "offer", "accepted", "rejected"],
  );
  assert.deepEqual(
    cols.map((c) => c.name),
    ["Dilamar", "Interview", "Offer", "Diterima", "Ditolak"],
  );
  assert.deepEqual(
    cols.map((c) => c.order),
    [0, 1, 2, 3, 4],
  );
  for (const c of cols) assert.equal(boardColumnSchema.safeParse(c).success, true);
});

test("applicationInputSchema requires company and position", () => {
  assert.equal(
    applicationInputSchema.safeParse({ company: "", position: "Dev" }).success,
    false,
  );
  const ok = applicationInputSchema.safeParse({
    company: "Acme",
    position: "Frontend Dev",
    workType: "remote",
    salaryMin: 5_000_000,
  });
  assert.equal(ok.success, true);
});

test("applicationInputSchema rejects invalid workType and negative salary", () => {
  assert.equal(
    applicationInputSchema.safeParse({
      company: "Acme",
      position: "Dev",
      workType: "on-site",
    }).success,
    false,
  );
  assert.equal(
    applicationInputSchema.safeParse({
      company: "Acme",
      position: "Dev",
      salaryMin: -1,
    }).success,
    false,
  );
});

test("moveApplicationSchema shape", () => {
  const ok = moveApplicationSchema.safeParse({
    id: "abc",
    columnId: "col-1",
    order: 0,
  });
  assert.equal(ok.success, true);
});
```

- [ ] **Step 2: Run test — harus FAIL** (module not found)

Run: `bun test features/job-tracker/lib/__tests__/schemas.test.ts`

- [ ] **Step 3: Implementasi `features/job-tracker/schemas/job-tracker.ts`**

```ts
import { z } from "zod";

export const columnKindSchema = z.enum([
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "custom",
]);
export type ColumnKind = z.infer<typeof columnKindSchema>;

export const boardColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  kind: columnKindSchema,
  order: z.number().int().min(0),
});
export type BoardColumn = z.infer<typeof boardColumnSchema>;

export const workTypeSchema = z.enum(["remote", "hybrid", "onsite"]);

export const applicationInputSchema = z.object({
  company: z.string().min(1, "Nama perusahaan wajib diisi").max(160),
  position: z.string().min(1, "Posisi wajib diisi").max(160),
  jobUrl: z.url("URL tidak valid").max(2000).optional().or(z.literal("")),
  location: z.string().max(160).optional(),
  workType: workTypeSchema.optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  cvId: z.string().optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
  appliedAt: z.coerce.date().optional(),
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export const applicationUpdateSchema = z.object({
  id: z.string(),
  data: applicationInputSchema.partial(),
});

export const moveApplicationSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  order: z.number().int().min(0),
});

export const updateColumnsSchema = z.object({
  columns: z.array(boardColumnSchema).min(1).max(20),
});

export const addNoteSchema = z.object({
  id: z.string(),
  note: z.string().min(1).max(2000),
});
```

- [ ] **Step 4: Implementasi `features/job-tracker/lib/default-columns.ts`**

```ts
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";

/** Kinds that map to the conversion funnel and cannot be deleted. */
export const PROTECTED_KINDS = [
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
] as const;

const DEFAULTS: { name: string; kind: BoardColumn["kind"] }[] = [
  { name: "Dilamar", kind: "applied" },
  { name: "Interview", kind: "interview" },
  { name: "Offer", kind: "offer" },
  { name: "Diterima", kind: "accepted" },
  { name: "Ditolak", kind: "rejected" },
];

/** Build the 5 default columns. `idFactory` is injected so tests stay deterministic. */
export function createDefaultColumns(idFactory: () => string): BoardColumn[] {
  return DEFAULTS.map((d, order) => ({ id: idFactory(), ...d, order }));
}
```

- [ ] **Step 5: Run test — PASS**, lalu `bun lint`

- [ ] **Step 6: Commit**

```bash
git add features/job-tracker/schemas features/job-tracker/lib
git commit -m "feat: job tracker zod schemas and default columns"
```

---

### Task 3: Pure board ops (validasi kolom & relokasi kartu)

**Files:**
- Create: `features/job-tracker/lib/board-ops.ts`
- Test: `features/job-tracker/lib/__tests__/board-ops.test.ts`

**Interfaces:**
- Consumes: `BoardColumn`, `PROTECTED_KINDS` dari Task 2.
- Produces:
  - `validateColumnUpdate(current: BoardColumn[], next: BoardColumn[]): { ok: true; removedColumnIds: string[] } | { ok: false; message: string }` — memastikan kolom ber-kind bawaan tidak hilang/berubah kind, kind baru hanya `custom`, order unik; `removedColumnIds` = kolom custom yang dihapus.
  - `resolveOrphanTarget(next: BoardColumn[]): string` — id kolom dengan `order` terkecil (tujuan relokasi kartu dari kolom terhapus).

- [ ] **Step 1: Tulis failing test `features/job-tracker/lib/__tests__/board-ops.test.ts`**

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  resolveOrphanTarget,
  validateColumnUpdate,
} from "@/features/job-tracker/lib/board-ops";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";

let n = 0;
const mkId = () => `c${n++}`;
const base = () => {
  n = 0;
  return createDefaultColumns(mkId);
};

test("rename and reorder of protected columns is allowed", () => {
  const cur = base();
  const next = cur.map((c, i) =>
    c.kind === "applied" ? { ...c, name: "Lamaran Masuk", order: 4 } : { ...c, order: i === 4 ? 0 : c.order },
  );
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, true);
});

test("deleting a protected column is rejected", () => {
  const cur = base();
  const next = cur.filter((c) => c.kind !== "offer");
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, false);
});

test("changing a protected column's kind is rejected", () => {
  const cur = base();
  const next = cur.map((c) =>
    c.kind === "offer" ? { ...c, kind: "custom" as const } : c,
  );
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, false);
});

test("new columns must be kind custom", () => {
  const cur = base();
  const bad = [...cur, { id: "x", name: "Extra", kind: "offer" as const, order: 5 }];
  assert.equal(validateColumnUpdate(cur, bad).ok, false);
  const good = [...cur, { id: "x", name: "Extra", kind: "custom" as const, order: 5 }];
  assert.equal(validateColumnUpdate(cur, good).ok, true);
});

test("deleting a custom column reports its id", () => {
  const cur = [...base(), { id: "cx", name: "Extra", kind: "custom" as const, order: 5 }];
  const next = cur.filter((c) => c.id !== "cx");
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.removedColumnIds, ["cx"]);
});

test("duplicate order values are rejected", () => {
  const cur = base();
  const next = cur.map((c) => ({ ...c, order: 0 }));
  assert.equal(validateColumnUpdate(cur, next).ok, false);
});

test("resolveOrphanTarget picks lowest-order column id", () => {
  const cols = base().map((c) => ({ ...c, order: 4 - c.order }));
  // rejected now has order 0
  assert.equal(resolveOrphanTarget(cols), cols.find((c) => c.order === 0)?.id);
});
```

- [ ] **Step 2: Run — FAIL** (`bun test features/job-tracker/lib/__tests__/board-ops.test.ts`)

- [ ] **Step 3: Implementasi `features/job-tracker/lib/board-ops.ts`**

```ts
import { PROTECTED_KINDS } from "@/features/job-tracker/lib/default-columns";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";

type ValidationResult =
  | { ok: true; removedColumnIds: string[] }
  | { ok: false; message: string };

/**
 * Validate a full-column replacement coming from the client.
 * Protected (funnel) columns may be renamed/reordered but never removed and
 * never change kind. New columns must be kind "custom". Orders must be unique.
 */
export function validateColumnUpdate(
  current: BoardColumn[],
  next: BoardColumn[],
): ValidationResult {
  const nextById = new Map(next.map((c) => [c.id, c]));

  for (const cur of current) {
    const upd = nextById.get(cur.id);
    if ((PROTECTED_KINDS as readonly string[]).includes(cur.kind)) {
      if (!upd) {
        return { ok: false, message: "Kolom bawaan tidak bisa dihapus" };
      }
      if (upd.kind !== cur.kind) {
        return { ok: false, message: "Jenis kolom bawaan tidak bisa diubah" };
      }
    }
  }

  const currentIds = new Set(current.map((c) => c.id));
  for (const col of next) {
    if (!currentIds.has(col.id) && col.kind !== "custom") {
      return { ok: false, message: "Kolom baru harus berjenis custom" };
    }
  }

  const orders = next.map((c) => c.order);
  if (new Set(orders).size !== orders.length) {
    return { ok: false, message: "Urutan kolom tidak valid" };
  }

  const nextIds = new Set(next.map((c) => c.id));
  const removedColumnIds = current
    .filter((c) => !nextIds.has(c.id))
    .map((c) => c.id);

  return { ok: true, removedColumnIds };
}

/** Where cards from deleted columns go: the lowest-order remaining column. */
export function resolveOrphanTarget(next: BoardColumn[]): string {
  const sorted = [...next].sort((a, b) => a.order - b.order);
  return sorted[0].id;
}
```

- [ ] **Step 4: Run — PASS**, `bun lint`

- [ ] **Step 5: Commit**

```bash
git add features/job-tracker/lib
git commit -m "feat: job tracker column validation and orphan relocation logic"
```

---

### Task 4: Pure stats + CSV

**Files:**
- Create: `features/job-tracker/lib/stats.ts`
- Create: `features/job-tracker/lib/csv.ts`
- Test: `features/job-tracker/lib/__tests__/stats-csv.test.ts`

**Interfaces:**
- Consumes: `BoardColumn` dari Task 2.
- Produces:
  - `type AppLike = { columnId: string; followUpDate: Date | null }`
  - `computeFunnel(columns: BoardColumn[], apps: AppLike[]): { kind: string; label: string; count: number }[]` — count per funnel kind (urut applied→rejected, label dari nama kolom; kolom `custom` di-exclude).
  - `countDueFollowUps(apps: AppLike[], now: Date): number`
  - `applicationsToCsv(apps: CsvApp[]): string` dengan `type CsvApp = { company: string; position: string; columnName: string; jobUrl: string | null; location: string | null; workType: string | null; salaryMin: number | null; salaryMax: number | null; appliedAt: Date; followUpDate: Date | null }` — CSV dengan header Indonesia, escaping RFC4180 (kutip ganda).

- [ ] **Step 1: Failing test `features/job-tracker/lib/__tests__/stats-csv.test.ts`**

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applicationsToCsv } from "@/features/job-tracker/lib/csv";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import {
  computeFunnel,
  countDueFollowUps,
} from "@/features/job-tracker/lib/stats";

let n = 0;
const cols = createDefaultColumns(() => `c${n++}`);
const appliedId = cols[0].id;
const interviewId = cols[1].id;

test("computeFunnel counts per kind and excludes custom columns", () => {
  const withCustom = [
    ...cols,
    { id: "cx", name: "Wishlist", kind: "custom" as const, order: 5 },
  ];
  const apps = [
    { columnId: appliedId, followUpDate: null },
    { columnId: appliedId, followUpDate: null },
    { columnId: interviewId, followUpDate: null },
    { columnId: "cx", followUpDate: null },
  ];
  const funnel = computeFunnel(withCustom, apps);
  assert.deepEqual(
    funnel.map((f) => f.kind),
    ["applied", "interview", "offer", "accepted", "rejected"],
  );
  assert.equal(funnel[0].count, 2);
  assert.equal(funnel[1].count, 1);
  assert.equal(funnel[2].count, 0);
});

test("countDueFollowUps counts only due dates", () => {
  const now = new Date("2026-07-31T00:00:00Z");
  const apps = [
    { columnId: appliedId, followUpDate: new Date("2026-07-30T00:00:00Z") },
    { columnId: appliedId, followUpDate: new Date("2026-08-05T00:00:00Z") },
    { columnId: appliedId, followUpDate: null },
  ];
  assert.equal(countDueFollowUps(apps, now), 1);
});

test("applicationsToCsv escapes quotes and commas", () => {
  const csv = applicationsToCsv([
    {
      company: 'Acme, "Inc"',
      position: "Dev",
      columnName: "Dilamar",
      jobUrl: null,
      location: null,
      workType: "remote",
      salaryMin: 5000000,
      salaryMax: null,
      appliedAt: new Date("2026-07-01T00:00:00Z"),
      followUpDate: null,
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(
    lines[0],
    "Perusahaan,Posisi,Status,URL,Lokasi,Tipe Kerja,Gaji Min,Gaji Max,Tanggal Lamar,Follow-up",
  );
  assert.ok(lines[1].startsWith('"Acme, ""Inc""",Dev,Dilamar,'));
});
```

- [ ] **Step 2: Run — FAIL** (`bun test features/job-tracker/lib/__tests__/stats-csv.test.ts`)

- [ ] **Step 3: Implementasi `features/job-tracker/lib/stats.ts`**

```ts
import { PROTECTED_KINDS } from "@/features/job-tracker/lib/default-columns";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";

export type AppLike = { columnId: string; followUpDate: Date | null };

/** Funnel counts in fixed kind order; custom columns are excluded. */
export function computeFunnel(columns: BoardColumn[], apps: AppLike[]) {
  const countByColumn = new Map<string, number>();
  for (const app of apps) {
    countByColumn.set(app.columnId, (countByColumn.get(app.columnId) ?? 0) + 1);
  }
  return PROTECTED_KINDS.map((kind) => {
    const col = columns.find((c) => c.kind === kind);
    return {
      kind,
      label: col?.name ?? kind,
      count: col ? (countByColumn.get(col.id) ?? 0) : 0,
    };
  });
}

export function countDueFollowUps(apps: AppLike[], now: Date): number {
  return apps.filter((a) => a.followUpDate !== null && a.followUpDate <= now)
    .length;
}
```

- [ ] **Step 4: Implementasi `features/job-tracker/lib/csv.ts`**

```ts
export type CsvApp = {
  company: string;
  position: string;
  columnName: string;
  jobUrl: string | null;
  location: string | null;
  workType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  appliedAt: Date;
  followUpDate: Date | null;
};

const HEADER =
  "Perusahaan,Posisi,Status,URL,Lokasi,Tipe Kerja,Gaji Min,Gaji Max,Tanggal Lamar,Follow-up";

function cell(value: string | number | null): string {
  if (value === null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function dateCell(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function applicationsToCsv(apps: CsvApp[]): string {
  const rows = apps.map((a) =>
    [
      cell(a.company),
      cell(a.position),
      cell(a.columnName),
      cell(a.jobUrl),
      cell(a.location),
      cell(a.workType),
      cell(a.salaryMin),
      cell(a.salaryMax),
      dateCell(a.appliedAt),
      dateCell(a.followUpDate),
    ].join(","),
  );
  return [HEADER, ...rows].join("\n");
}
```

- [ ] **Step 5: Run — PASS**, `bun lint`

- [ ] **Step 6: Commit**

```bash
git add features/job-tracker/lib
git commit -m "feat: job tracker funnel stats and csv export logic"
```

---

### Task 5: requirePaidPlan + router inti (getBoard, updateColumns)

**Files:**
- Create: `features/job-tracker/server/plan-gate.ts`
- Create: `features/job-tracker/server/job-tracker-router.ts`
- Modify: `server/trpc/routers/_app.ts`

**Interfaces:**
- Consumes: `createDefaultColumns`, `validateColumnUpdate`, `resolveOrphanTarget` (Task 2-3); pola `protectedProcedure` dari `@/server/trpc/trpc`; `Subscription` model (`plan`, `status`, `expiresAt`) — aktif jika `status === "active" && expiresAt > new Date()` (lihat `features/billing/server/billing-router.ts:83`).
- Produces:
  - `assertPaidPlan(ctx: { prisma: PrismaClient; session: { user: { id: string } } }): Promise<void>` — throw `TRPCError FORBIDDEN` message `"Fitur ini khusus paket Basic/Pro"` jika tidak aktif.
  - Router `jobTrackerRouter` dengan `getBoard` (query) dan `updateColumns` (mutation), dimount sebagai `jobTracker` di `_app.ts`.
  - `getBoard` return: `{ board: { id, columns }, applications: JobApplication[] }` (applications diurutkan `order` asc).

- [ ] **Step 1: `features/job-tracker/server/plan-gate.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

/**
 * Job tracker is a Basic/Pro feature. Called at the top of every jobTracker
 * procedure; free users get FORBIDDEN and the client renders the upsell view.
 */
export async function assertPaidPlan(ctx: {
  prisma: PrismaClient;
  session: { user: { id: string } };
}): Promise<void> {
  const sub = await ctx.prisma.subscription.findUnique({
    where: { userId: ctx.session.user.id },
  });
  const isActive = sub?.status === "active" && sub.expiresAt > new Date();
  if (!isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Fitur ini khusus paket Basic/Pro",
    });
  }
}
```

- [ ] **Step 2: `features/job-tracker/server/job-tracker-router.ts` (inti)**

```ts
import { validateColumnUpdate, resolveOrphanTarget } from "@/features/job-tracker/lib/board-ops";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import { updateColumnsSchema } from "@/features/job-tracker/schemas/job-tracker";
import { assertPaidPlan } from "@/features/job-tracker/server/plan-gate";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { TRPCError } from "@trpc/server";

export const jobTrackerRouter = createTRPCRouter({
  /** Board + all applications. Lazily creates the board with default columns. */
  getBoard: protectedProcedure.query(async ({ ctx }) => {
    await assertPaidPlan(ctx);
    const userId = ctx.session.user.id;

    let board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
    if (!board) {
      board = await ctx.prisma.jobBoard.create({
        data: { userId, columns: createDefaultColumns(() => crypto.randomUUID()) },
      });
    }

    const applications = await ctx.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    return { board: { id: board.id, columns: board.columns }, applications };
  }),

  /** Full-column replacement: add/rename/reorder/delete-custom. */
  updateColumns: protectedProcedure
    .input(updateColumnsSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      const userId = ctx.session.user.id;

      const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
      if (!board) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board tidak ditemukan" });
      }

      const result = validateColumnUpdate(board.columns, input.columns);
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }

      // Relocate cards from deleted custom columns to the first column.
      if (result.removedColumnIds.length > 0) {
        const targetId = resolveOrphanTarget(input.columns);
        await ctx.prisma.jobApplication.updateMany({
          where: { userId, columnId: { in: result.removedColumnIds } },
          data: { columnId: targetId },
        });
      }

      const updated = await ctx.prisma.jobBoard.update({
        where: { userId },
        data: { columns: input.columns },
      });
      return { columns: updated.columns };
    }),
});
```

Catatan: id kolom/timeline pakai `crypto.randomUUID()` (tersedia di Node runtime Next.js) — jangan tambah dependency id generator baru.

- [ ] **Step 3: Mount di `server/trpc/routers/_app.ts`**

Tambah import `import { jobTrackerRouter } from "@/features/job-tracker/server/job-tracker-router";` dan entry `jobTracker: jobTrackerRouter,` setelah `ai: aiRouter,`.

- [ ] **Step 4: Verifikasi typecheck + lint**

Run: `bun lint` dan `bunx tsc --noEmit` (atau `bun build` bila cepat). Expected: tanpa error.

- [ ] **Step 5: Commit**

```bash
git add features/job-tracker/server server/trpc/routers/_app.ts
git commit -m "feat: job tracker router core with paid-plan gate"
```

---

### Task 6: Router lengkap (CRUD, move, note, stats, CSV, AI email)

**Files:**
- Modify: `features/job-tracker/server/job-tracker-router.ts`
- Create: `features/job-tracker/server/prompts/follow-up-email.ts`

**Interfaces:**
- Consumes: schemas Task 2, `computeFunnel`/`countDueFollowUps`/`applicationsToCsv` Task 4, `openrouter` + `checkRateLimit` dari `features/ai/lib/` (pola `features/ai/server/ai-router.ts`), env `DEFAULT_MODEL_MINI`.
- Produces procedures: `createApplication`, `updateApplication`, `deleteApplication`, `moveApplication`, `addNote`, `getStats`, `exportCsv`, `generateFollowUpEmail` — nama & shape persis seperti di bawah (dipakai frontend Task 7-11).

- [ ] **Step 1: `features/job-tracker/server/prompts/follow-up-email.ts`**

```ts
export const followUpEmailSystemPrompt = `Kamu adalah asisten karier. Tulis email follow-up lamaran kerja dalam Bahasa Indonesia yang profesional, sopan, dan ringkas (maksimal 150 kata). Sertakan subject line di baris pertama dengan format "Subject: ...". Sesuaikan isi dengan status lamaran yang diberikan (mis. baru melamar, setelah interview, menunggu offer). Jangan mengarang detail yang tidak diberikan.`;
```

- [ ] **Step 2: Tambahkan procedures berikut ke `jobTrackerRouter`**

```ts
// imports tambahan:
import { openrouter } from "@/features/ai/lib/openrouter";
import { checkRateLimit } from "@/features/ai/lib/rate-limit";
import { applicationsToCsv } from "@/features/job-tracker/lib/csv";
import { computeFunnel, countDueFollowUps } from "@/features/job-tracker/lib/stats";
import {
  addNoteSchema,
  applicationInputSchema,
  applicationUpdateSchema,
  moveApplicationSchema,
} from "@/features/job-tracker/schemas/job-tracker";
import { followUpEmailSystemPrompt } from "@/features/job-tracker/server/prompts/follow-up-email";
import { z } from "zod";

const DEFAULT_MODEL_MINI =
  process.env.DEFAULT_MODEL_MINI ?? "openai/gpt-4o-mini";

// helper dalam file (bukan export): ambil app milik user atau throw NOT_FOUND
async function getOwnedApplication(
  ctx: { prisma: PrismaClient; session: { user: { id: string } } },
  id: string,
) {
  const app = await ctx.prisma.jobApplication.findUnique({ where: { id } });
  if (!app || app.userId !== ctx.session.user.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lamaran tidak ditemukan" });
  }
  return app;
}
```

```ts
  createApplication: protectedProcedure
    .input(applicationInputSchema.extend({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      const userId = ctx.session.user.id;

      // Verify column exists on the user's board.
      const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
      if (!board?.columns.some((c) => c.id === input.columnId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Kolom tidak valid" });
      }

      // If a CV is linked, it must belong to the user.
      if (input.cvId) {
        const cv = await ctx.prisma.cV.findUnique({
          where: { id: input.cvId },
          select: { userId: true },
        });
        if (!cv || cv.userId !== userId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CV tidak valid" });
        }
      }

      // Append at the end of the column.
      const count = await ctx.prisma.jobApplication.count({
        where: { userId, columnId: input.columnId },
      });

      const { columnId, jobUrl, ...rest } = input;
      const app = await ctx.prisma.jobApplication.create({
        data: {
          ...rest,
          jobUrl: jobUrl || null,
          userId,
          columnId,
          order: count,
          timeline: [],
        },
      });
      return app;
    }),

  updateApplication: protectedProcedure
    .input(applicationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await getOwnedApplication(ctx, input.id);

      if (input.data.cvId) {
        const cv = await ctx.prisma.cV.findUnique({
          where: { id: input.data.cvId },
          select: { userId: true },
        });
        if (!cv || cv.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CV tidak valid" });
        }
      }

      const { jobUrl, ...rest } = input.data;
      return ctx.prisma.jobApplication.update({
        where: { id: input.id },
        data: { ...rest, ...(jobUrl !== undefined ? { jobUrl: jobUrl || null } : {}) },
      });
    }),

  deleteApplication: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await getOwnedApplication(ctx, input.id);
      await ctx.prisma.jobApplication.delete({ where: { id: input.id } });
      return { id: input.id };
    }),

  /** Drag-drop: set column+order; rewrites order of affected columns; appends
   *  a status_change timeline event when the column kind changes. */
  moveApplication: protectedProcedure
    .input(moveApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      const userId = ctx.session.user.id;
      const app = await getOwnedApplication(ctx, input.id);

      const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
      const targetCol = board?.columns.find((c) => c.id === input.columnId);
      if (!targetCol) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Kolom tidak valid" });
      }
      const sourceCol = board?.columns.find((c) => c.id === app.columnId);

      const timelineEvent =
        sourceCol && sourceCol.kind !== targetCol.kind
          ? {
              id: crypto.randomUUID(),
              type: "status_change",
              fromKind: sourceCol.kind,
              toKind: targetCol.kind,
              note: null,
              createdAt: new Date(),
            }
          : null;

      // Rewrite target column order: fetch siblings, splice, persist.
      const siblings = await ctx.prisma.jobApplication.findMany({
        where: { userId, columnId: input.columnId, id: { not: input.id } },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const ids = siblings.map((s) => s.id);
      const insertAt = Math.min(input.order, ids.length);
      ids.splice(insertAt, 0, input.id);

      await ctx.prisma.$transaction([
        ...ids.map((id, order) =>
          ctx.prisma.jobApplication.update({
            where: { id },
            data:
              id === input.id
                ? {
                    columnId: input.columnId,
                    order,
                    ...(timelineEvent ? { timeline: { push: timelineEvent } } : {}),
                  }
                : { order },
          }),
        ),
      ]);

      return { id: input.id, columnId: input.columnId };
    }),

  addNote: protectedProcedure
    .input(addNoteSchema)
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await getOwnedApplication(ctx, input.id);
      return ctx.prisma.jobApplication.update({
        where: { id: input.id },
        data: {
          timeline: {
            push: {
              id: crypto.randomUUID(),
              type: "note",
              fromKind: null,
              toKind: null,
              note: input.note,
              createdAt: new Date(),
            },
          },
        },
      });
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    await assertPaidPlan(ctx);
    const userId = ctx.session.user.id;
    const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
    const apps = await ctx.prisma.jobApplication.findMany({
      where: { userId },
      select: { columnId: true, followUpDate: true },
    });
    return {
      total: apps.length,
      funnel: board ? computeFunnel(board.columns, apps) : [],
      dueFollowUps: countDueFollowUps(apps, new Date()),
    };
  }),

  exportCsv: protectedProcedure.mutation(async ({ ctx }) => {
    await assertPaidPlan(ctx);
    const userId = ctx.session.user.id;
    const board = await ctx.prisma.jobBoard.findUnique({ where: { userId } });
    const colName = new Map(board?.columns.map((c) => [c.id, c.name]) ?? []);
    const apps = await ctx.prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { appliedAt: "desc" },
    });
    const csv = applicationsToCsv(
      apps.map((a) => ({
        company: a.company,
        position: a.position,
        columnName: colName.get(a.columnId) ?? "",
        jobUrl: a.jobUrl,
        location: a.location,
        workType: a.workType,
        salaryMin: a.salaryMin,
        salaryMax: a.salaryMax,
        appliedAt: a.appliedAt,
        followUpDate: a.followUpDate,
      })),
    );
    return { csv };
  }),

  generateFollowUpEmail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertPaidPlan(ctx);
      await checkRateLimit(ctx.session.user.id, "ai:followUpEmail", 10);
      const app = await getOwnedApplication(ctx, input.id);

      const board = await ctx.prisma.jobBoard.findUnique({
        where: { userId: ctx.session.user.id },
      });
      const status =
        board?.columns.find((c) => c.id === app.columnId)?.name ?? "Dilamar";

      const response = await openrouter.chat.completions.create({
        model: DEFAULT_MODEL_MINI,
        stream: false,
        messages: [
          { role: "system", content: followUpEmailSystemPrompt },
          {
            role: "user",
            content: `Perusahaan: ${app.company}\nPosisi: ${app.position}\nStatus lamaran: ${status}\nTanggal melamar: ${app.appliedAt.toISOString().slice(0, 10)}`,
          },
        ],
        max_tokens: 500,
      });

      const email = response.choices[0]?.message?.content ?? "";
      if (!email) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat email follow-up. Coba lagi.",
        });
      }
      return { email };
    }),
```

Catatan implementer: cek signature `checkRateLimit` di `features/ai/lib/rate-limit.ts` — pola pemakaian `(userId, key, limit)` seperti di ai-router.

- [ ] **Step 3: Verifikasi**

Run: `bun lint` + `bunx tsc --noEmit`. Expected: bersih. Jalankan juga seluruh test lib: `bun test features/job-tracker/lib/__tests__/`.

- [ ] **Step 4: Commit**

```bash
git add features/job-tracker/server
git commit -m "feat: job tracker full router with csv export and ai follow-up"
```

---

### Task 7: Page entry + gating + upsell view

**Files:**
- Modify: `app/(dashboard)/dashboard/job-tracker/page.tsx` (ganti isi placeholder)
- Create: `features/job-tracker/components/job-tracker-page.tsx`
- Create: `features/job-tracker/components/upsell-view.tsx`

**Interfaces:**
- Consumes: `trpc.jobTracker.getBoard` (Task 5); pola client tRPC dari `lib/trpc/` (lihat komponen dashboard cv yang pakai `useTRPC`/`useQuery` — implementer WAJIB baca satu komponen dashboard existing, mis. `features/cv/components/dashboard/`, dan tiru persis pola query-nya).
- Produces: `<JobTrackerPage />` (client component) — dirender page.tsx; `<UpsellView />` untuk user free.

- [ ] **Step 1: Baca pola existing**

Baca `app/(dashboard)/dashboard/job-tracker/page.tsx` (placeholder saat ini), `app/(dashboard)/dashboard/job-tracker/layout.tsx`, dan satu komponen dashboard cv untuk pola tRPC client + loading state. Simpan konten visual placeholder (ilustrasi kanban, feature cards) untuk dipakai ulang di UpsellView.

- [ ] **Step 2: `features/job-tracker/components/upsell-view.tsx`**

Client component: repurpose desain placeholder — headline "Pelacak Lamaran khusus paket Basic/Pro", ringkasan fitur (pipeline Kanban, reminder, statistik — ambil dari feature cards placeholder), CTA `Button` link ke `/dashboard/billing` dengan teks "Upgrade Sekarang". Hapus fake waitlist form.

- [ ] **Step 3: `features/job-tracker/components/job-tracker-page.tsx`**

```tsx
"use client";

// Pola query mengikuti komponen dashboard existing (lihat Step 1).
// Perilaku:
// - Query trpc.jobTracker.getBoard dengan retry: false (FORBIDDEN jangan diretry)
// - isLoading -> skeleton (pakai komponen Skeleton shadcn, layout 5 kolom placeholder)
// - error?.data?.code === "FORBIDDEN" -> <UpsellView />
// - error lain -> pesan error + tombol coba lagi (refetch)
// - sukses -> <KanbanBoard board={data.board} applications={data.applications} />
//   (KanbanBoard dibuat Task 8 — untuk task ini render sementara
//   <pre>{JSON.stringify(data.board.columns, null, 2)}</pre> agar bisa diverifikasi)
```

Tulis implementasi nyata mengikuti komentar di atas — komentar tersebut adalah spesifikasi perilaku, bukan placeholder yang boleh dilewati.

- [ ] **Step 4: Ganti `app/(dashboard)/dashboard/job-tracker/page.tsx`**

```tsx
import { JobTrackerPage } from "@/features/job-tracker/components/job-tracker-page";

export default function Page() {
  return <JobTrackerPage />;
}
```

(Biarkan `layout.tsx` yang sudah set metadata via `constructMetadata`.)

- [ ] **Step 5: Verifikasi manual**

Run: `bun dev`, buka `/dashboard/job-tracker` sebagai user dengan subscription aktif (atau set manual di DB via `bun db:studio`): harus melihat JSON kolom default. Sebagai user free: UpsellView. `bun lint` bersih.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/dashboard/job-tracker features/job-tracker/components
git commit -m "feat: job tracker page entry with paid-plan upsell"
```

---

### Task 8: Kanban board + drag-drop

**Files:**
- Create: `features/job-tracker/components/kanban-board.tsx`
- Create: `features/job-tracker/components/kanban-column.tsx`
- Create: `features/job-tracker/components/application-card.tsx`
- Modify: `features/job-tracker/components/job-tracker-page.tsx` (ganti `<pre>` dengan `<KanbanBoard />`)

**Interfaces:**
- Consumes: `trpc.jobTracker.moveApplication` (Task 6); dnd-kit (`@dnd-kit/core` `DndContext`, `useDroppable`, `useDraggable` atau `@dnd-kit/sortable`) — sudah terinstall; tipe `JobApplication` dari `@prisma/client`.
- Produces:
  - `<KanbanBoard board applications onCardClick={(app) => void} />`
  - `<ApplicationCard app columnKind onClick />` — menampilkan company, position, badge lokasi/workType, badge destructive "Perlu follow-up" bila `followUpDate <= now`.

- [ ] **Step 1: `application-card.tsx`**

Card shadcn kecil: judul `position`, subjudul `company`, baris badge (`location`, label workType: remote→"Remote", hybrid→"Hybrid", onsite→"Onsite"), badge variant destructive "Perlu follow-up" jika `app.followUpDate && new Date(app.followUpDate) <= new Date()`. `onClick` prop untuk buka detail sheet (Task 10).

- [ ] **Step 2: `kanban-column.tsx`**

Droppable container (`useDroppable({ id: column.id })`): header nama kolom + count, body list `ApplicationCard` (masing-masing draggable via `useDraggable({ id: app.id })` atau `SortableContext` per kolom), min-height agar kolom kosong tetap droppable, width tetap (~w-72), styling ring saat `isOver`.

- [ ] **Step 3: `kanban-board.tsx`**

```tsx
// Perilaku (implementasi nyata, komentar = spesifikasi):
// - Container: flex gap-4 overflow-x-auto, satu KanbanColumn per kolom (sort by order)
// - Kelompokkan applications per columnId, sort by order
// - DndContext onDragEnd: tentukan columnId tujuan + index tujuan;
//   panggil mutation moveApplication({ id, columnId, order })
// - Optimistic update: onMutate -> cancel query getBoard, snapshot cache,
//   setQueryData memindahkan app di cache; onError -> restore snapshot + toast
//   "Gagal memindahkan lamaran"; onSettled -> invalidate getBoard
// - PENTING (React 19 + dnd-kit): gunakan sensor PointerSensor dengan
//   activationConstraint { distance: 5 } agar klik kartu tetap memicu onClick
```

- [ ] **Step 4: Sambungkan di `job-tracker-page.tsx`** — ganti `<pre>` dengan `<KanbanBoard>`; `onCardClick` sementara no-op (diisi Task 10).

- [ ] **Step 5: Verifikasi manual**

`bun dev`: tambah data via `bun db:studio` (2-3 `job_application` dengan `columnId` valid), drag antar kolom → posisi persist setelah reload; kolom kosong menerima drop. `bun lint` bersih.

- [ ] **Step 6: Commit**

```bash
git add features/job-tracker/components
git commit -m "feat: job tracker kanban board with drag and drop"
```

---

### Task 9: Form tambah/edit lamaran + toolbar

**Files:**
- Create: `features/job-tracker/components/application-dialog.tsx`
- Create: `features/job-tracker/components/board-toolbar.tsx`
- Modify: `features/job-tracker/components/job-tracker-page.tsx`

**Interfaces:**
- Consumes: `applicationInputSchema` (Task 2) via `zodResolver`; `trpc.jobTracker.createApplication` / `updateApplication` / `deleteApplication` (Task 6); `trpc.cv.list` untuk pilihan CV (`{ id, title }`); `trpc.jobTracker.exportCsv`.
- Produces:
  - `<ApplicationDialog open onOpenChange columns defaultColumnId application? />` — mode create (application undefined) / edit; berisi seluruh field spec.
  - `<BoardToolbar onAdd />` — tombol "Tambah Lamaran" + "Export CSV".

- [ ] **Step 1: `application-dialog.tsx`**

Dialog shadcn + `useForm` dengan `zodResolver(applicationInputSchema)`. Fields:
- company (Input, label "Perusahaan"), position (Input, "Posisi")
- columnId (Select dari props `columns`, label "Status", default `defaultColumnId`)
- jobUrl (Input, "URL Lowongan"), location (Input, "Lokasi")
- workType (Select: Remote/Hybrid/Onsite, "Tipe Kerja")
- salaryMin/salaryMax (Input number, "Gaji Min/Max (Rp)") — konversi ke number via `valueAsNumber` atau parse manual, kosong = undefined
- cvId (Select dari `trpc.cv.list` → opsi "Tanpa CV" + judul CV, label "CV yang Dipakai")
- followUpDate (date picker — pakai pola date input yang ada di repo, atau `<Input type="date">` bila belum ada pola; label "Tanggal Follow-up")
- appliedAt (Input type="date", "Tanggal Melamar", default hari ini saat create)
- notes (Textarea, "Catatan")

Submit: create → `createApplication.mutate({ ...values, columnId })`; edit → `updateApplication.mutate({ id, data: values })`. onSuccess: invalidate `getBoard` + `getStats`, tutup dialog, toast sukses. Tombol submit `Button loading={mutation.isPending} loadingText="Menyimpan..."`. Mode edit menampilkan tombol "Hapus" (variant destructive, konfirmasi `AlertDialog`, `loadingText="Menghapus..."`).

- [ ] **Step 2: `board-toolbar.tsx`**

Baris atas board: `Button` "Tambah Lamaran" (buka dialog mode create, kolom default = kolom order terkecil) + `Button` variant outline "Export CSV": panggil `exportCsv.mutate()`, onSuccess buat blob & trigger download:

```ts
const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "lamaran-zyvo.csv";
a.click();
URL.revokeObjectURL(url);
```

`loadingText="Mengekspor..."`.

- [ ] **Step 3: Rakit di `job-tracker-page.tsx`** — state `dialogOpen` + `editingApp`; toolbar di atas board; card click → nanti Task 10 (sheet), edit dari sheet.

- [ ] **Step 4: Verifikasi manual** — create/edit/delete lamaran end-to-end di browser; validasi error muncul (company kosong); CSV terdownload dan terbuka benar. `bun lint`.

- [ ] **Step 5: Commit**

```bash
git add features/job-tracker/components
git commit -m "feat: job tracker application form, delete, and csv export"
```

---

### Task 10: Detail sheet — timeline, catatan, AI follow-up

**Files:**
- Create: `features/job-tracker/components/application-detail-sheet.tsx`
- Modify: `features/job-tracker/components/job-tracker-page.tsx` (wire `onCardClick`)

**Interfaces:**
- Consumes: `trpc.jobTracker.addNote`, `generateFollowUpEmail` (Task 6); tipe timeline: `{ id, type: "status_change" | "note", fromKind, toKind, note, createdAt }`; `date-fns` (`format`, locale `id` dari `date-fns/locale`) untuk tanggal.
- Produces: `<ApplicationDetailSheet app columns open onOpenChange onEdit />`.

- [ ] **Step 1: Implementasi sheet**

Sheet shadcn (side="right"). Isi:
1. Header: position + company, badge status (nama kolom), link `jobUrl` bila ada (`target="_blank" rel="noreferrer"`), tombol "Edit" → `onEdit(app)` (buka ApplicationDialog).
2. Detail: lokasi, tipe kerja, range gaji (format `Intl.NumberFormat("id-ID")`), CV terkait (judul dari `trpc.cv.list` cache), tanggal melamar, tanggal follow-up.
3. **Timeline**: list vertikal dari `app.timeline` urut createdAt desc. Event `status_change`: "Status berubah: {label fromKind} → {label toKind}" (label = nama kolom ber-kind tsb dari props `columns`, fallback kind mentah). Event `note`: teks note. Tanggal via date-fns format "d MMM yyyy, HH:mm" locale id.
4. **Tambah catatan**: Textarea + `Button loading loadingText="Menyimpan..."` → `addNote.mutate({ id, note })`, onSuccess invalidate `getBoard`, kosongkan textarea.
5. **AI follow-up**: `Button` "Buat Email Follow-up (AI)" `loadingText="Membuat email..."` → `generateFollowUpEmail.mutate({ id })`. onSuccess: tampilkan hasil di blok `<pre className="whitespace-pre-wrap">` + tombol "Salin" (`navigator.clipboard.writeText`, toast "Tersalin"). onError: tampilkan pesan error inline di bawah tombol + tombol tetap bisa diklik ulang (retry).

- [ ] **Step 2: Wire `onCardClick`** di page → set `selectedApp`, buka sheet. `onEdit` menutup sheet & membuka dialog edit.

- [ ] **Step 3: Verifikasi manual** — pindahkan kartu antar kolom beda kind → timeline event muncul; tambah catatan; generate email AI (butuh `OPENROUTER_API_KEY` env — bila tak tersedia, verifikasi error state tampil benar). `bun lint`.

- [ ] **Step 4: Commit**

```bash
git add features/job-tracker/components
git commit -m "feat: job tracker detail sheet with timeline and ai follow-up"
```

---

### Task 11: Kelola kolom + stats cards

**Files:**
- Create: `features/job-tracker/components/column-header.tsx`
- Create: `features/job-tracker/components/stats-cards.tsx`
- Modify: `features/job-tracker/components/kanban-column.tsx` (pakai ColumnHeader)
- Modify: `features/job-tracker/components/kanban-board.tsx` (tombol "+ Tambah Kolom" di ujung kanan)
- Modify: `features/job-tracker/components/job-tracker-page.tsx` (stats di atas toolbar)

**Interfaces:**
- Consumes: `trpc.jobTracker.updateColumns`, `getStats` (Task 5-6); `PROTECTED_KINDS` (Task 2).
- Produces: `<ColumnHeader column columns />` (rename/hapus), `<StatsCards />` (self-fetching via getStats).

- [ ] **Step 1: `column-header.tsx`**

- Nama kolom klik-untuk-rename: state editing → Input inline, blur/Enter simpan via `updateColumns.mutate({ columns: renamed })` (kirim SELURUH array kolom dengan satu nama diubah), Escape batal.
- DropdownMenu (icon ⋯): "Ubah Nama"; "Hapus Kolom" hanya bila `column.kind === "custom"` (konfirmasi AlertDialog, teks "Lamaran di kolom ini akan dipindah ke kolom pertama."), kirim array kolom tanpa kolom tsb dengan `order` di-reindex 0..n-1.
- onError semua mutasi: toast pesan error dari server.

- [ ] **Step 2: Tombol "+ Tambah Kolom"** di `kanban-board.tsx` — di ujung kanan container: `updateColumns.mutate({ columns: [...columns, { id: crypto.randomUUID(), name: "Kolom Baru", kind: "custom", order: maxOrder + 1 }] })`, lalu invalidate getBoard.

- [ ] **Step 3: `stats-cards.tsx`**

Query `getStats` (`retry: false`). Grid 3 card shadcn:
1. "Total Lamaran" — angka besar `total`
2. "Funnel Konversi" — baris per tahap: `{label}: {count}` + persentase dari total applied (`count / funnel[0].count`, guard div-0, tampil "—" bila applied 0); tahap applied tanpa persentase
3. "Perlu Follow-up" — `dueFollowUps`, angka merah bila > 0

Loading: Skeleton. Invalidate `getStats` ikut di onSuccess mutasi (sudah dilakukan di Task 9; pastikan move di Task 8 juga invalidate `getStats` pada onSettled — tambahkan bila belum).

- [ ] **Step 4: Verifikasi manual** — rename kolom, tambah kolom custom, hapus kolom custom (kartu pindah ke kolom pertama), coba hapus kolom bawaan (menu tidak ada), stats berubah setelah move. `bun lint` + `bun test features/job-tracker/lib/__tests__/`.

- [ ] **Step 5: Commit**

```bash
git add features/job-tracker/components
git commit -m "feat: job tracker column management and stats cards"
```

---

### Task 12: Verifikasi akhir & build

**Files:** tidak ada file baru.

- [ ] **Step 1: Jalankan semua test** — `bun test features/job-tracker/lib/__tests__/` dan test cv existing `bun test features/cv/lib/__tests__/` (pastikan tidak ada regresi).

- [ ] **Step 2: `bun lint`** — bersih (jalankan `bun format` bila perlu).

- [ ] **Step 3: `bun build`** — production build sukses.

- [ ] **Step 4: Smoke test manual** di `bun dev`:
  - User free → upsell view dengan CTA billing
  - User berbayar → full flow: buka board (kolom default terbentuk), tambah lamaran lengkap (semua field + link CV), drag antar kolom, timeline terisi, tambah catatan, AI email, rename/tambah/hapus kolom, stats akurat, export CSV.

- [ ] **Step 5: Commit akhir bila ada perbaikan**

```bash
git add -A
git commit -m "chore: job tracker final polish"
```
