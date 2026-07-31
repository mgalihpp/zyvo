# Kanban Column Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick a color per kanban column from a preset palette of 8, with kind-based defaults for built-in columns.

**Architecture:** `color` is an optional string on the embedded `JobBoardColumn` Prisma type and the `boardColumnSchema` Zod schema; no server router changes. A client-side helper resolves a column's effective color (stored value or kind-based fallback) to static Tailwind classes. UI: accent bar + dot on `KanbanColumn`, dot + swatch picker in `ColumnHeader`'s dropdown.

**Tech Stack:** Next.js 16, Prisma (MongoDB composite type), Zod, tRPC v11, Tailwind v4, shadcn/ui.

## Global Constraints

- No test framework in this repo — verify each task with `bun lint` and manual reasoning; final task verifies in the running app.
- Tailwind v4: color classes must be static string literals (no template interpolation) or they get purged.
- All UI copy in Indonesian (existing convention: "Ubah Nama", "Hapus Kolom" → new item "Warna").
- Package manager is `bun`.

---

### Task 1: Data layer — Prisma field, Zod enum, color helper

**Files:**
- Modify: `prisma/schema.prisma` (type `JobBoardColumn`, ~line 252)
- Modify: `features/job-tracker/schemas/job-tracker.ts`
- Create: `features/job-tracker/lib/column-colors.ts`

**Interfaces:**
- Produces: `columnColorSchema` / `ColumnColor` type (Zod enum of 8 names); `BoardColumn` now has optional `color`; `COLUMN_COLORS: Record<ColumnColor, { bar: string; dot: string; swatch: string }>`; `getColumnColor(column: Pick<BoardColumn, "color" | "kind">): ColumnColor`; `COLUMN_COLOR_NAMES: ColumnColor[]`.

- [ ] **Step 1: Add `color` to the Prisma composite type**

In `prisma/schema.prisma`, inside `type JobBoardColumn`:

```prisma
type JobBoardColumn {
  id    String // client-generated id
  name  String // user-renamable label
  kind  String // "applied" | "interview" | "offer" | "accepted" | "rejected" | "custom"
  order Int
  color String? // preset color name; null = fallback by kind
}
```

- [ ] **Step 2: Regenerate Prisma client and push schema**

Run: `bun db:generate` then `bun db:push`
Expected: both succeed (optional field on composite type — no migration issues).

- [ ] **Step 3: Add color enum + field to Zod schema**

In `features/job-tracker/schemas/job-tracker.ts`, after `columnKindSchema`:

```ts
export const columnColorSchema = z.enum([
  "blue",
  "green",
  "yellow",
  "purple",
  "red",
  "orange",
  "pink",
  "gray",
]);
export type ColumnColor = z.infer<typeof columnColorSchema>;
```

And in `boardColumnSchema` add:

```ts
  color: columnColorSchema.optional(),
```

- [ ] **Step 4: Create the color helper**

Create `features/job-tracker/lib/column-colors.ts`:

```ts
import type {
  BoardColumn,
  ColumnColor,
} from "@/features/job-tracker/schemas/job-tracker";

/** Static Tailwind classes per preset color — do NOT build these dynamically
 *  (Tailwind v4 only keeps literal class strings). `bar` = column accent bar,
 *  `dot` = small indicator next to the column name, `swatch` = picker circle. */
export const COLUMN_COLORS: Record<
  ColumnColor,
  { bar: string; dot: string; swatch: string }
> = {
  blue: { bar: "bg-blue-500", dot: "bg-blue-500", swatch: "bg-blue-500" },
  green: { bar: "bg-green-500", dot: "bg-green-500", swatch: "bg-green-500" },
  yellow: {
    bar: "bg-yellow-500",
    dot: "bg-yellow-500",
    swatch: "bg-yellow-500",
  },
  purple: {
    bar: "bg-purple-500",
    dot: "bg-purple-500",
    swatch: "bg-purple-500",
  },
  red: { bar: "bg-red-500", dot: "bg-red-500", swatch: "bg-red-500" },
  orange: {
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    swatch: "bg-orange-500",
  },
  pink: { bar: "bg-pink-500", dot: "bg-pink-500", swatch: "bg-pink-500" },
  gray: { bar: "bg-gray-400", dot: "bg-gray-400", swatch: "bg-gray-400" },
};

export const COLUMN_COLOR_NAMES = Object.keys(COLUMN_COLORS) as ColumnColor[];

/** Indonesian labels for the picker's aria-labels. */
export const COLUMN_COLOR_LABELS: Record<ColumnColor, string> = {
  blue: "Biru",
  green: "Hijau",
  yellow: "Kuning",
  purple: "Ungu",
  red: "Merah",
  orange: "Oranye",
  pink: "Merah muda",
  gray: "Abu-abu",
};

const KIND_DEFAULTS: Record<string, ColumnColor> = {
  applied: "blue",
  interview: "yellow",
  offer: "purple",
  accepted: "green",
  rejected: "red",
  custom: "gray",
};

/** Effective color: stored value, else default by kind, else gray. */
export function getColumnColor(
  column: Pick<BoardColumn, "color" | "kind">,
): ColumnColor {
  return column.color ?? KIND_DEFAULTS[column.kind] ?? "gray";
}
```

- [ ] **Step 5: Lint**

Run: `bun lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma features/job-tracker/schemas/job-tracker.ts features/job-tracker/lib/column-colors.ts
git commit -m "feat: column color field, schema enum, and color helper"
```

---

### Task 2: KanbanColumn — accent bar + dot in default header

**Files:**
- Modify: `features/job-tracker/components/kanban-column.tsx`

**Interfaces:**
- Consumes: `getColumnColor`, `COLUMN_COLORS` from `@/features/job-tracker/lib/column-colors` (Task 1).

- [ ] **Step 1: Add imports**

```ts
import {
  COLUMN_COLORS,
  getColumnColor,
} from "@/features/job-tracker/lib/column-colors";
```

- [ ] **Step 2: Resolve color and render accent bar + dot**

Inside `KanbanColumn`, before `return`:

```ts
const color = COLUMN_COLORS[getColumnColor(column)];
```

Change the root div: the column currently has `p-3`; switch to `overflow-hidden pb-3 px-3` (no top padding — the bar owns the top edge) and add the bar as the first child:

```tsx
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex max-h-full w-72 shrink-0 flex-col gap-2 overflow-hidden rounded-xl bg-muted/40 px-3 pb-3",
        isCardOver && "ring-2 ring-primary/40 ring-inset",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      {/* Column accent bar — full-bleed across the top. */}
      <div
        className={cn("-mx-3 h-1 shrink-0", color.bar)}
        aria-hidden="true"
      />
```

In the default (fallback) header, add the dot before the name:

```tsx
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span
                className={cn("size-2 rounded-full", color.dot)}
                aria-hidden="true"
              />
              {column.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {applications.length}
            </span>
          </div>
```

- [ ] **Step 3: Lint**

Run: `bun lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add features/job-tracker/components/kanban-column.tsx
git commit -m "feat: column accent bar and color dot on kanban column"
```

---

### Task 3: ColumnHeader — dot + color picker in dropdown

**Files:**
- Modify: `features/job-tracker/components/column-header.tsx`

**Interfaces:**
- Consumes: `COLUMN_COLORS`, `COLUMN_COLOR_NAMES`, `COLUMN_COLOR_LABELS`, `getColumnColor` (Task 1); existing `updateColumns` mutation in the component.

- [ ] **Step 1: Add imports**

```ts
import {
  COLUMN_COLOR_LABELS,
  COLUMN_COLOR_NAMES,
  COLUMN_COLORS,
  getColumnColor,
} from "@/features/job-tracker/lib/column-colors";
import { cn } from "@/lib/utils";
```

Also add `ColumnColor` to the existing schema type import:

```ts
import type {
  BoardColumn,
  ColumnColor,
} from "@/features/job-tracker/schemas/job-tracker";
```

- [ ] **Step 2: Add setColor handler**

Next to `commitRename`/`deleteColumn`:

```ts
  function setColor(color: ColumnColor) {
    updateColumns.mutate({
      columns: columns.map((c) => (c.id === column.id ? { ...c, color } : c)),
    });
  }
```

- [ ] **Step 3: Add the dot next to the column name (non-editing state)**

Replace the name `<button>` content:

```tsx
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
          onClick={() => {
            setName(column.name);
            setEditing(true);
          }}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              COLUMN_COLORS[getColumnColor(column)].dot,
            )}
            aria-hidden="true"
          />
          <span className="truncate">{column.name}</span>
        </button>
```

(The `truncate` moves to an inner span since the button becomes a flex row.)

- [ ] **Step 4: Add swatch row to the dropdown**

In `DropdownMenuContent`, after the "Ubah Nama" item and before the custom-only delete item:

```tsx
            {/* Swatch row — not a menu item; clicking a swatch sets the color
                and closes the menu via the default item-less click-through. */}
            <div
              role="group"
              aria-label="Warna kolom"
              className="flex items-center gap-1.5 px-2 py-1.5"
            >
              {COLUMN_COLOR_NAMES.map((name) => {
                const selected = getColumnColor(column) === name;
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={COLUMN_COLOR_LABELS[name]}
                    aria-pressed={selected}
                    className={cn(
                      "size-4 rounded-full transition-transform hover:scale-110",
                      COLUMN_COLORS[name].swatch,
                      selected &&
                        "ring-2 ring-foreground/60 ring-offset-1 ring-offset-popover",
                    )}
                    onClick={() => setColor(name)}
                  />
                );
              })}
            </div>
```

- [ ] **Step 5: Lint**

Run: `bun lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add features/job-tracker/components/column-header.tsx
git commit -m "feat: column color picker in column header menu"
```

---

### Task 4: Manual verification in the running app

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

Run: `bun dev` (background) and open the job tracker page.

- [ ] **Step 2: Verify defaults**

Expected: built-in columns show kind-based accent bars/dots (applied=biru, interview=kuning, offer=ungu, accepted=hijau, rejected=merah); custom columns abu-abu.

- [ ] **Step 3: Verify picking a color**

Open a column's ⋯ menu → click a swatch. Expected: bar + dot update after refetch; persists on page reload. Check both light and dark mode.

- [ ] **Step 4: Verify drag still works**

Drag a card and a column. Expected: no regression; accent bar doesn't break ring highlight or drag styling.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: kanban color polish from manual verification"
```

(Skip if nothing changed.)
