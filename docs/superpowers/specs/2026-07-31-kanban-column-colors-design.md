# Kanban Column Colors — Design

Date: 2026-07-31
Feature: job-tracker

## Goal

Let users color each kanban column. Preset palette of 8 colors, user-selectable
per column via the column menu. Built-in columns get a sensible default color
based on their `kind`.

## Data model

- `JobBoardColumn` (Prisma composite type) gains `color String?` — optional so
  existing board documents remain valid, no migration/backfill needed.
- `boardColumnSchema` (Zod) gains
  `color: z.enum(["blue","green","yellow","purple","red","orange","pink","gray"]).optional()`.
- Server router unchanged — `updateColumns` already validates with
  `boardColumnSchema`, so the new field flows through.

## Fallback defaults (client-side only)

Columns with no `color` stored resolve by `kind`:

| kind      | color  |
|-----------|--------|
| applied   | blue   |
| interview | yellow |
| offer     | purple |
| accepted  | green  |
| rejected  | red    |
| custom    | gray   |

Helper `getColumnColor(column)` in
`features/job-tracker/lib/column-colors.ts`, alongside a
`COLUMN_COLORS` map from color name → Tailwind classes (accent bar, dot,
swatch). Static class strings (no dynamic interpolation) so Tailwind v4 keeps
them; chosen to read well in both light and dark mode.

## UI

- **KanbanColumn**: 3px accent bar across the top of the column (rounded to
  match the column's `rounded-xl`) + small colored dot next to the column name
  in the default header. Color comes from `getColumnColor`.
- **ColumnHeader** (custom header used by the page): same colored dot next to
  the name, and a "Warna" row in the dropdown menu showing 8 round swatches.
  Clicking a swatch calls `updateColumns.mutate` with the column's `color`
  updated (same optimistic/invalidate pattern as rename). Available for all
  columns, not just custom ones. Current color shows a selected ring.

## Files touched

- `prisma/schema.prisma` — add `color String?` to `JobBoardColumn`
- `features/job-tracker/schemas/job-tracker.ts` — add color enum + field
- `features/job-tracker/lib/column-colors.ts` — new: palette map + fallback
- `features/job-tracker/components/kanban-column.tsx` — accent bar + dot
- `features/job-tracker/components/column-header.tsx` — dot + color picker menu

## Out of scope

- Free-form hex picker
- Coloring cards by column color
- Backfilling `color` into existing DB documents
