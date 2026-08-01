# Landing Highlight Card Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mini hardcoded visual previews to the Pipeline Kanban, Email follow-up AI, and Ekspor CSV cards in the landing Job Tracker highlight grid, matching the existing Statistik card's funnel-bars pattern.

**Architecture:** Pure decorative JSX in `features/marketing/components/job-tracker-showcase.tsx`. Each card gets a preview block below its description. No store, no tRPC, no interactivity, no new deps, no new CSS.

**Tech Stack:** React 19 (client component), Tailwind CSS v4, lucide-react icons (already imported), `COLUMN_COLORS` from `features/job-tracker/lib/column-colors.ts`.

## Global Constraints

- File edited only: `features/marketing/components/job-tracker-showcase.tsx`
- All preview content hardcoded — MUST NOT touch Zustand store, tRPC, or job-tracker feature code
- Reuse existing imports where possible (`KanbanSquareIcon`, `MailIcon`, `SheetIcon`, `BarChart3Icon` already imported)
- `COLUMN_COLORS` already imported (line 20) — use `COLUMN_COLORS[color].dot` for column dots
- Indonesian copy for any visible labels, consistent with existing card text
- Run `bun lint` after each task; commits follow repo style (`feat(showcase): ...`)
- Verification: `bun dev` and view `#job-tracker` section; previews render on all 4 cards at `lg` breakpoint

---
## Task 1: Pipeline Kanban mini board preview

**Files:**
- Modify: `features/marketing/components/job-tracker-showcase.tsx` (card block ~line 380-429)

**Interfaces:**
- Produces: inline JSX block rendered only when `item.title === "Pipeline Kanban"`, placed inside the card `<div>` after the `<p>` description (line 390-392), before the Statistik conditional.

- [ ] **Step 1: Add the mini board preview block**

Inside the card body, after the description `<p>`, add a conditional block. Place it right before the existing `{item.title === "Statistik & insight" && (...)}` block:

```tsx
{item.title === "Pipeline Kanban" && (
  <div className="mt-4 space-y-2">
    {[
      { name: "Dilamar", color: "blue", count: 3 },
      { name: "Interview", color: "yellow", count: 2 },
      { name: "Offer", color: "purple", count: 1 },
    ].map((col) => (
      <div key={col.name} className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            COLUMN_COLORS[col.color as ColumnColor].dot,
          )}
        />
        <span className="w-16 shrink-0 text-[0.7rem] text-muted-foreground">
          {col.name}
        </span>
        <div className="flex flex-1 gap-1">
          {Array.from({ length: col.count }, (_, i) => (
            <span
              key={i}
              className="h-6 flex-1 rounded border bg-background shadow-sm"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2: Verify render + lint**

Run: `bun lint`
Expected: PASS.

Run: `bun dev`, open `/` at `lg` width. Confirm the Pipeline Kanban card shows 3 mini rows (dot + column name + stacked mini cards). Hover behavior unchanged.

- [ ] **Step 3: Commit**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "feat(showcase): mini kanban preview on pipeline highlight card"
```

---
## Task 2: Email follow-up AI draft preview

**Files:**
- Modify: `features/marketing/components/job-tracker-showcase.tsx` (card block ~line 380-429)

**Interfaces:**
- Produces: inline JSX block rendered when `item.title === "Email follow-up AI"`.

- [ ] **Step 1: Add the mini draft email preview block**

Inside the card body, after the description `<p>`, before the Statistik conditional, add:

```tsx
{item.title === "Email follow-up AI" && (
  <div className="mt-4 space-y-2">
    <div className="rounded-lg bg-muted p-2 font-sans text-[0.65rem] leading-5 text-foreground">
      <p className="text-muted-foreground">To: hr@traveloka.com</p>
      <p className="text-muted-foreground">Subject: Tindak lanjut lamaran</p>
      <p className="mt-1">
        Halo Tim Traveloka, saya ingin menindaklanjuti lamaran saya untuk
        posisi Backend Engineer...
      </p>
    </div>
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-violet-600 dark:text-violet-400">
      <SparklesIcon className="size-3" />
      Buat Email
    </span>
  </div>
)}
```

> Note: `SparklesIcon` is NOT yet imported in this file. Add it to the lucide-react import block (line 3-10), e.g. `SparklesIcon,` after `SheetIcon,`.

- [ ] **Step 2: Verify render + lint**

Run: `bun lint`
Expected: PASS (no unused imports, `SparklesIcon` imported).

Run: `bun dev`, open `/`. Confirm the Email follow-up AI card shows the mini draft (`bg-muted` block + violet sparkles chip).

- [ ] **Step 3: Commit**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "feat(showcase): mini email draft preview on follow-up card"
```

---
## Task 3: Ekspor CSV table preview

**Files:**
- Modify: `features/marketing/components/job-tracker-showcase.tsx` (card block ~line 380-429)

**Interfaces:**
- Produces: inline JSX block rendered when `item.title === "Ekspor CSV"`.

- [ ] **Step 1: Add the mini CSV table preview block**

Inside the card body, after the description `<p>`, before the Statistik conditional, add:

```tsx
{item.title === "Ekspor CSV" && (
  <div className="mt-4 space-y-2">
    <div className="overflow-hidden rounded-lg border bg-background font-mono text-[0.65rem]">
      <div className="grid grid-cols-3 gap-x-2 border-b bg-muted/60 px-2 py-1 font-medium text-muted-foreground">
        <span>Perusahaan</span>
        <span>Posisi</span>
        <span>Status</span>
      </div>
      {[
        ["Tokopedia", "Frontend", "Dilamar"],
        ["Traveloka", "Backend", "Interview"],
        ["Ruangguru", "Fullstack", "Offer"],
      ].map((row) => (
        <div key={row[0]} className="grid grid-cols-3 gap-x-2 border-b px-2 py-1 last:border-b-0">
          {row.map((cell) => (
            <span key={cell} className="truncate text-foreground">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
      <DownloadIcon className="size-3" />
      lamaran-zyvo.csv
    </span>
  </div>
)}
```

> Note: `DownloadIcon` is NOT yet imported in this file. Add it to the lucide-react import block (line 3-10), e.g. `DownloadIcon,` after `BarChart3Icon,`.

- [ ] **Step 2: Verify render + lint**

Run: `bun lint`
Expected: PASS (no unused imports, `DownloadIcon` imported).

Run: `bun dev`, open `/`. Confirm the Ekspor CSV card shows the mini table (header row + 3 data rows + `lamaran-zyvo.csv` chip). Confirm all 4 cards render previews and the grid row has even heights.

- [ ] **Step 3: Commit**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "feat(showcase): mini csv preview on export highlight card"
```

---
## Task 4: Final verification

**Files:**
- No changes.

- [ ] **Step 1: Full lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 2: Visual check at all breakpoints**

Run: `bun dev`, open `/`. Check the highlight grid at `sm` (2-col), `lg` (4-col), and mobile (1-col): previews don't overflow their card, no layout shift on hover, reduced-motion users see static previews (all blocks are static — no animation added).

- [ ] **Step 3: Confirm in-app Kanban untouched**

Run: `git diff HEAD --stat`
Expected: only `features/marketing/components/job-tracker-showcase.tsx` modified across the three commits. No job-tracker feature files changed.
