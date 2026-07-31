# CV Version History — Design

Date: 2026-07-31
Status: Approved by user (brainstorming session)

## Problem

The builder autosaves every 800ms of idle time (`use-cv-autosave.ts` → `cv.update`). Users have no way to go back to an earlier state of their CV — a bad edit or accidental deletion is permanent once autosaved.

## Goal

Server-persisted version history per CV: automatic snapshots, a history panel in the builder to browse versions, and safe one-click restore.

Out of scope: in-session undo/redo (Ctrl+Z), version diffing/preview rendering, named versions.

## Decisions (from brainstorming)

- **Persisted history**, not client-side undo.
- **Snapshot cadence:** on change, at most once per 10 minutes (interval + change).
- **Retention:** last 30 versions per CV; older auto-deleted.
- **UI:** new panel following the existing builder panel pattern (`features/cv/components/panels/`).
- **Restore semantics:** snapshot current content first, then overwrite — restore never loses data.
- **Storage:** separate `CvVersion` collection with full-content JSON snapshots (Option A). Rejected: embedded `versions[]` array (document bloat), diff-based storage (complexity overkill for small CV documents).

## Data model

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

`content` is `Json`, not composite types: snapshots are read-only blobs used only for listing/restore, so duplicating the CV type tree buys nothing. No formal relation to `CV`/user, matching the repo convention (`userId` string match).

## Snapshot logic (server-side, inside existing `cv.update`)

After the ownership check in `cv-router.ts` `update`:

1. Fetch the newest `CvVersion` for this `cvId`.
2. If none exists, OR its `createdAt` is older than 10 minutes → create a version from the CV's **current (pre-update)** content.
3. Run the update as before.
4. After inserting a version, delete versions beyond the newest 30 (`findMany` with `skip: 30` → `deleteMany` by ids).

Snapshot failures are best-effort: log and continue; never fail the autosave because of versioning. The client autosave hook is unchanged.

## tRPC procedures (in `cv-router.ts`)

- `listVersions` — input `{ cvId }`; ownership-checked; returns `{ id, createdAt }[]` newest first (content excluded to keep payload small).
- `restoreVersion` — input `{ cvId, versionId }`; ownership-checked; steps:
  1. Load the version; if missing → `NOT_FOUND`.
  2. Snapshot the CV's current content as a new version (unconditionally — this is the "restore never loses data" guarantee, bypassing the 10-minute rule).
  3. Overwrite the CV with the version's `content`.
  4. Return the updated CV.

## UI — history panel

New panel following the existing pattern in `features/cv/components/panels/`:

- Lists versions from `listVersions`: absolute date + relative time (e.g. "31 Jul, 14:02 — 2 jam lalu").
- Each item has a Restore button → confirmation dialog → `restoreVersion` mutation. Buttons use the `Button` `loading`/`loadingText` props per repo convention.
- On success: re-hydrate the Zustand CV store from the returned CV and invalidate the versions list (the pre-restore snapshot now appears at the top).
- Empty state when no versions exist yet.

## Error handling

- Restore of a deleted version → `NOT_FOUND`, surfaced as a toast; list refetched.
- Snapshot creation failure inside `update` → logged, autosave still succeeds.
- Restore races with an in-flight autosave: acceptable — the debounced autosave may overwrite the restore only if the user keeps typing during restore; the pre-restore snapshot still protects the data.

## Testing

- Router: snapshot created on first update; not created within 10-minute window; created after window; retention trims to 30; restore snapshots-then-overwrites; ownership rejection; `NOT_FOUND` on missing version.
- Panel: list rendering, restore confirmation flow, store re-hydration on success.
