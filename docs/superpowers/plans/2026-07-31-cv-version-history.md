# CV Version History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-persisted CV version history: automatic snapshots on autosave (max 1 per 10 minutes), a "Riwayat" panel in the builder listing versions, and safe restore that snapshots current content first.

**Architecture:** New `CvVersion` MongoDB collection (full-content JSON snapshots, no relation — `userId`/`cvId` string match per repo convention). Snapshot logic lives inside the existing `cv.update` tRPC mutation so the client autosave hook is untouched. Two new tRPC procedures (`listVersions`, `restoreVersion`). New lazy-loaded history panel following the existing builder panel pattern, wired into `BuilderPanel` union + sidebar.

**Tech Stack:** Next.js 16, tRPC v11, Prisma (mongodb), Zustand, shadcn/ui, Biome. Spec: `docs/superpowers/specs/2026-07-31-cv-version-history-design.md`.

## Global Constraints

- Retention: keep newest **30** versions per CV; delete the rest after inserting.
- Snapshot cadence: on `cv.update`, only if newest version is absent or older than **10 minutes** (`SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000`).
- Snapshot failures must never fail the autosave (wrap in try/catch, `console.error`).
- All UI copy in Indonesian (repo convention — see existing panels).
- Async buttons must use `Button` `loading`/`loadingText` props (repo convention).
- Use `bun` for all commands. There is NO test runner in this repo — verification is `bunx tsc --noEmit` (or `bun lint`) + manual browser check; do not add a test framework.
- Commit after every task.

---

### Task 1: Prisma model `CvVersion`

**Files:**
- Modify: `prisma/schema.prisma` (append after the `CV` model, around line 104)

**Interfaces:**
- Produces: Prisma client model `ctx.prisma.cvVersion` with fields `{ id, cvId, userId, content (Json), createdAt }` — used by Tasks 2–3.

- [ ] **Step 1: Add the model**

Append to `prisma/schema.prisma`:

```prisma
model CvVersion {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  cvId      String   @db.ObjectId
  userId    String
  content   Json     // full snapshot: title, templateId, typography, colors, all sections
  createdAt DateTime @default(now())

  @@index([cvId, createdAt(sort: Desc)])
  @@map("cv_version")
}
```

- [ ] **Step 2: Push schema and regenerate client**

Run: `bun db:push` then `bun db:generate`
Expected: both succeed; `ctx.prisma.cvVersion` now exists on the client type.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(cv): add CvVersion model for version history"
```

### Task 2: Snapshot-on-update in `cv.update`

**Files:**
- Modify: `features/cv/server/cv-router.ts` (the `update` procedure, lines 83–102)

**Interfaces:**
- Consumes: `ctx.prisma.cvVersion` from Task 1.
- Produces: helper `snapshotCv(prisma, cv)` (module-private) reused by Task 3's `restoreVersion`. Signature: `async function snapshotCv(prisma: PrismaClient, cv: CV): Promise<void>` — creates a version from a full CV row and trims retention to 30.

- [ ] **Step 1: Add constants + helper above the router**

In `features/cv/server/cv-router.ts`, after the imports add:

```ts
import type { CV, PrismaClient } from "@prisma/client";

const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 30;

/**
 * Persists a full-content snapshot of a CV row and trims history to the
 * newest MAX_VERSIONS. Content is stored as a plain JSON blob — versions are
 * read-only and only ever restored wholesale, so no composite types needed.
 */
async function snapshotCv(prisma: PrismaClient, cv: CV): Promise<void> {
  const {
    id: _id,
    userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...content
  } = cv;

  await prisma.cvVersion.create({
    data: { cvId: cv.id, userId, content },
  });

  const stale = await prisma.cvVersion.findMany({
    where: { cvId: cv.id },
    orderBy: { createdAt: "desc" },
    skip: MAX_VERSIONS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.cvVersion.deleteMany({
      where: { id: { in: stale.map((v) => v.id) } },
    });
  }
}
```

Note: if TypeScript rejects `content` for the `Json` field, cast with `content as Prisma.InputJsonValue` (import `Prisma` from `@prisma/client`).

- [ ] **Step 2: Wire snapshot into `update`**

Replace the body of the `update` mutation with:

```ts
update: protectedProcedure
  .input(z.object({ id: z.string(), data: cvUpdateSchema }))
  .mutation(async ({ ctx, input }) => {
    // Full row (not just userId): the pre-update content is what gets
    // snapshotted when the 10-minute window has elapsed.
    const existing = await ctx.prisma.cV.findUnique({
      where: { id: input.id },
    });

    if (!existing || existing.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
    }

    // Best-effort snapshot of the pre-update state, at most once per
    // SNAPSHOT_INTERVAL_MS. Never blocks the save itself.
    try {
      const latest = await ctx.prisma.cvVersion.findFirst({
        where: { cvId: input.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (
        !latest ||
        Date.now() - latest.createdAt.getTime() > SNAPSHOT_INTERVAL_MS
      ) {
        await snapshotCv(ctx.prisma, existing);
      }
    } catch (err) {
      console.error("cv version snapshot failed", err);
    }

    const updated = await ctx.prisma.cV.update({
      where: { id: input.id },
      data: input.data,
      select: { id: true, updatedAt: true },
    });

    return updated;
  }),
```

- [ ] **Step 3: Type-check + lint**

Run: `bunx tsc --noEmit` and `bun lint`
Expected: no new errors (pre-existing unrelated diagnostics in `use-cv-page-breaks.ts` may remain).

- [ ] **Step 4: Manual verify**

Run `bun dev`, edit a CV in the builder, wait for autosave, then in `bun db:studio` confirm a `cv_version` row exists for that CV. Edit again immediately — no second row (10-minute window).

- [ ] **Step 5: Commit**

```bash
git add features/cv/server/cv-router.ts
git commit -m "feat(cv): snapshot pre-update content on autosave"
```

### Task 3: `listVersions` + `restoreVersion` procedures

**Files:**
- Modify: `features/cv/server/cv-router.ts` (append procedures before the closing `});` of the router)

**Interfaces:**
- Consumes: `snapshotCv` helper and `ctx.prisma.cvVersion` from Task 2.
- Produces:
  - `trpc.cv.listVersions` — input `{ cvId: string }`, returns `{ id: string; createdAt: Date }[]` newest first.
  - `trpc.cv.restoreVersion` — input `{ cvId: string; versionId: string }`, returns the full updated CV row (same shape as `getById`).

- [ ] **Step 1: Add the procedures**

Inside `cvRouter`, after `delete`:

```ts
listVersions: protectedProcedure
  .input(z.object({ cvId: z.string() }))
  .query(async ({ ctx, input }) => {
    const cv = await ctx.prisma.cV.findUnique({
      where: { id: input.cvId },
      select: { userId: true },
    });
    if (!cv || cv.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
    }

    // Content is excluded: the panel only needs timestamps, and snapshots
    // are full CV blobs that would bloat the payload.
    return ctx.prisma.cvVersion.findMany({
      where: { cvId: input.cvId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
  }),

restoreVersion: protectedProcedure
  .input(z.object({ cvId: z.string(), versionId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const cv = await ctx.prisma.cV.findUnique({ where: { id: input.cvId } });
    if (!cv || cv.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "CV not found" });
    }

    const version = await ctx.prisma.cvVersion.findUnique({
      where: { id: input.versionId },
    });
    if (!version || version.cvId !== input.cvId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Versi tidak ditemukan",
      });
    }

    // Restore never loses data: the current state becomes a new version
    // first (unconditionally — bypasses the 10-minute window on purpose).
    await snapshotCv(ctx.prisma, cv);

    const content = version.content as Prisma.CVUpdateInput;
    return ctx.prisma.cV.update({
      where: { id: input.cvId },
      data: content,
    });
  }),
```

Add `Prisma` to the `@prisma/client` import if not already there.

- [ ] **Step 2: Type-check + lint**

Run: `bunx tsc --noEmit` and `bun lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add features/cv/server/cv-router.ts
git commit -m "feat(cv): listVersions and restoreVersion procedures"
```

### Task 4: Store — `history` panel id + `replaceContent` action

**Files:**
- Modify: `features/cv/stores/cv-store.ts`
- Modify: `features/cv/components/builder-sidebar.tsx`

**Interfaces:**
- Produces:
  - `BuilderPanel` union gains `"history"`.
  - Store action `replaceContent: (content: CvContent) => void` — overwrites all content fields WITHOUT bumping `revision` (a restore is already persisted server-side; bumping would trigger a redundant autosave). Sets `saveStatus: "saved"` and `lastSavedAt: Date.now()`.

- [ ] **Step 1: Extend the panel union**

In `features/cv/stores/cv-store.ts`, add `"history"` to both the `BuilderPanel` type (line ~38) and `VALID_PANELS` (line ~47), before `"export"`:

```ts
export type BuilderPanel =
  | "personal"
  | "sections"
  | "template"
  | "typography"
  | "colors"
  | "ai"
  | "history"
  | "export";

export const VALID_PANELS: readonly BuilderPanel[] = [
  "personal",
  "sections",
  "template",
  "typography",
  "colors",
  "ai",
  "history",
  "export",
];
```

- [ ] **Step 2: Add `replaceContent`**

Add to the `CvState` interface (near `getContent` at line ~172):

```ts
/** Overwrites all content fields after a server-side restore. Does NOT bump
 *  revision — the restored state is already persisted. */
replaceContent: (content: CvContent) => void;
```

Add the implementation in `createCvStore` (near `markSaved`):

```ts
replaceContent: (content) =>
  set({
    ...content,
    draftColors: null,
    saveStatus: "saved",
    lastSavedAt: Date.now(),
  }),
```

- [ ] **Step 3: Add sidebar item**

In `features/cv/components/builder-sidebar.tsx`, import `HistoryIcon` from `lucide-react` and add to `SIDEBAR_ITEMS` before the export item:

```ts
{ id: "history", label: "Riwayat", icon: HistoryIcon },
```

- [ ] **Step 4: Type-check + lint**

Run: `bunx tsc --noEmit` and `bun lint`
Expected: pass (the panel switch in `panels/index.tsx` has a `default` case, so the new id compiles before Task 5).

- [ ] **Step 5: Commit**

```bash
git add features/cv/stores/cv-store.ts features/cv/components/builder-sidebar.tsx
git commit -m "feat(cv): history panel id, sidebar entry, replaceContent action"
```

### Task 5: History panel component

**Files:**
- Create: `features/cv/components/panels/history-panel.tsx`
- Modify: `features/cv/components/panels/index.tsx`

**Interfaces:**
- Consumes: `trpc.cv.listVersions` / `trpc.cv.restoreVersion` (Task 3), `replaceContent` (Task 4).
- Produces: `export function HistoryPanel()` — lazy-loaded in `panels/index.tsx` under `case "history"`.

- [ ] **Step 1: Create the panel**

`features/cv/components/panels/history-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CvContent } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

/** "31 Jul 2026, 14.02" in the user's locale. */
function formatVersionDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HistoryPanel() {
  const cvId = useCvStore((s) => s.cvId);
  const replaceContent = useCvStore((s) => s.replaceContent);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const versions = trpc.cv.listVersions.useQuery(
    { cvId: cvId ?? "" },
    { enabled: !!cvId },
  );

  const restoreMutation = trpc.cv.restoreVersion.useMutation({
    onSuccess: (cv) => {
      // The server returns the full restored CV row; strip identity fields
      // down to CvContent and hydrate the store with it.
      const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...rest } = cv;
      replaceContent(rest as CvContent);
      setConfirmId(null);
      utils.cv.listVersions.invalidate({ cvId: cv.id });
    },
    onError: () => {
      setConfirmId(null);
      versions.refetch();
    },
  });

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Riwayat</h2>
        <p className="text-xs text-muted-foreground">
          Kembalikan CV ke versi sebelumnya. Versi tersimpan otomatis saat Anda
          mengedit.
        </p>
      </div>

      <div className="p-4">
        {versions.isLoading ? (
          <div className="space-y-3">
            {["a", "b", "c"].map((id) => (
              <Skeleton key={id} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Gagal memuat riwayat. Coba lagi nanti.
          </p>
        ) : versions.data && versions.data.length > 0 ? (
          <ul className="space-y-3">
            {versions.data.map((v, i) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatVersionDate(new Date(v.createdAt))}
                  </p>
                  {i === 0 ? (
                    <p className="text-xs text-muted-foreground">Terbaru</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmId(v.id)}
                >
                  Pulihkan
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada versi tersimpan. Versi dibuat otomatis saat Anda
            mengedit CV.
          </p>
        )}
      </div>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan versi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Konten CV saat ini akan disimpan sebagai versi baru terlebih
              dahulu, lalu diganti dengan versi yang dipilih.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <Button
              loading={restoreMutation.isPending}
              loadingText="Memulihkan..."
              onClick={() => {
                if (cvId && confirmId) {
                  restoreMutation.mutate({ cvId, versionId: confirmId });
                }
              }}
            >
              Pulihkan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

Note for implementer: check `features/cv/components/dashboard/cv-list.tsx` (uses the same AlertDialog components) and match its exact import/usage pattern if it differs — e.g. if it uses `AlertDialogAction` instead of a plain `Button` in the footer, still use `Button` here because the repo convention requires `loading`/`loadingText` on async buttons.

- [ ] **Step 2: Wire into the panel switch**

In `features/cv/components/panels/index.tsx`:

Add the lazy import next to the others:

```ts
const HistoryPanel = lazy(() =>
  import("./history-panel").then((m) => ({ default: m.HistoryPanel })),
);
```

Add a skeleton next to the other skeletons:

```tsx
/** Fallback for the lazy history panel: header + a stack of version rows. */
function HistorySkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="space-y-3 p-4">
        {["a", "b", "c"].map((id) => (
          <Skeleton key={id} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

Add the case in `ActivePanel` before `case "export"`:

```tsx
case "history":
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryPanel />
    </Suspense>
  );
```

- [ ] **Step 3: Type-check + lint**

Run: `bunx tsc --noEmit` and `bun lint`
Expected: pass.

- [ ] **Step 4: Manual verify end-to-end**

Run `bun dev`:
1. Open a CV in the builder → click the "Riwayat" sidebar icon → panel lists versions (or empty state).
2. Edit the CV, wait for autosave → refresh panel shows a version.
3. Click "Pulihkan" → confirm → CV content in preview reverts to the older state, and a new version (the pre-restore snapshot) appears at the top of the list.
4. Keep editing after restore → autosave still works, save indicator behaves normally.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/panels/history-panel.tsx features/cv/components/panels/index.tsx
git commit -m "feat(cv): history panel with version list and restore"
```
