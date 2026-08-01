# Landing Page — Job Tracker Highlight Cards: Mini Previews

Date: 2026-08-01
Status: Approved

## Goal

Three of the four landing-page Job Tracker highlight cards (Pipeline Kanban,
Email follow-up AI, Ekspor CSV) are plain icon + title + description. The
fourth ("Statistik & insight") already shows a funnel-bars preview. Give the
three plain cards the same kind of mini visual preview so the row reads as
lived-in, matching the in-app feature visuals.

Location: `features/marketing/components/job-tracker-showcase.tsx`, highlight
grid (line 380-429).

## Approach

Each card gets a small hardcoded preview block below its description, in the
same position/style slot the `FUNNEL` block occupies on the Statistik card.
All previews are decorative: no store, no tRPC, no interactivity — safe on the
public landing page.

### 1. Pipeline Kanban — mini board

- A horizontal strip of 3 mini columns (Dilamar/blue, Interview/yellow,
  Offer/purple) using the real `COLUMN_COLORS[].dot` for the column dot.
- Each column holds 1-2 mini cards (rounded, `border bg-background`, tiny
  position + company line), mirroring the in-app `ApplicationCard` styling at
  reduced size.
- `overflow-hidden` + fixed height so it never distorts card layout.

### 2. Email follow-up AI — mini draft email

- A `bg-muted rounded-lg p-2 font-sans text-xs` block, mirroring the generated
  email `pre` in `application-detail-sheet.tsx` (line 297).
- Contents: `To:` line, `Subject:` line, 2 body lines.
- A small sparkles chip ("Buat Email") sits inline to echo the AI action.

### 3. Ekspor CSV — mini table

- A tiny monospace table mirroring the real CSV header from
  `features/job-tracker/lib/csv.ts` (`Perusahaan,Posisi,Status`) + 3 hardcoded
  data rows (e.g. Tokopedia/Frontend/Dilamar).
- Header row + `border-b` separators, muted mono text.
- A small file chip `lamaran-zyvo.csv` to echo the real download filename
  (`board-toolbar.tsx`).

## Consistency with the in-app Kanban page

Reviewed before designing: `stats-cards.tsx`, `kanban-column.tsx`,
`application-card.tsx`, `application-detail-sheet.tsx`, `board-toolbar.tsx`.
The previews reuse the app's real visual tokens (column colors, card border,
email `pre` style, CSV header) so the landing mock reads consistent with the
product. The in-app Kanban page is NOT modified — previews are decorative only.

## Files touched

- `features/marketing/components/job-tracker-showcase.tsx` — add the three
  preview blocks + their hardcoded mock data.

No new CSS, no new dependencies, no tests (pure decorative JSX).

## Out of scope

- No changes to the in-app Kanban board, `BoardPreview`, `BoardMock`, or the
  Statistik card's existing funnel block.
- No interactivity or data wiring on the landing previews.
