# Job Tracker — Free-plan upsell redesign

**Date:** 2026-08-01
**Scope:** UI-only. Improve the screen free-plan users see when they open the Job
Tracker, so it accurately showcases the feature and drives the upgrade CTA.

## Problem

Free users hitting the Basic/Pro-gated Job Tracker get `UpsellView`
(`features/job-tracker/components/upsell-view.tsx`) — a flat three-card pitch that
undersells the product. The real tracker has a drag-and-drop Kanban with colored
columns + undo, a conversion-funnel stats dashboard, an AI assistant (cover
letter / interview prep / JD-match scoring), CV sync, follow-up reminders, and
CSV export.

## Approach

Hero + blurred real-board preview + expanded feature grid. Show the product
(locked) as visual proof, then enumerate its real capabilities.

## Structure (top → bottom)

1. **Hero** — plan badge, headline, subcopy, primary CTA "Upgrade Sekarang"
   (`/dashboard/billing`) + secondary "Lihat paket". Starting price line pulled
   from `PLANS.basic` (`features/billing/lib/plans.ts`) so it stays truthful
   (Rp15.000/bln).
2. **Locked board preview** — new `board-preview.tsx`: a static, fake mini Kanban
   using the real visual vocabulary (colored column dots from `COLUMN_COLORS`,
   application cards with position/company + Remote/Onsite badges + a "Perlu
   follow-up" badge). Wrapped in a `blur-[2px]`, slightly-scaled,
   `pointer-events-none`, `select-none`, `aria-hidden` container with a
   bottom gradient fade and a centered lock chip. Pure presentational markup —
   no dnd-kit, no store, no queries.
3. **Feature showcase** — card grid covering the actual features: Kanban
   pipeline, AI Assistant, Statistik & funnel, Reminder follow-up, Sinkronisasi
   CV, Export CSV. AI card gets a violet accent matching the app's AI styling.

## Files

- **New:** `features/job-tracker/components/board-preview.tsx` — static blurred
  mock board.
- **Rewrite:** `features/job-tracker/components/upsell-view.tsx` — hero +
  `<BoardPreview />` + expanded feature grid.
- No router, schema, or data changes. `JobTrackerPage` renders `<UpsellView />`
  on `FORBIDDEN` — untouched.

## Design-system fidelity

- Reuse `Card`, `Badge`, `buttonVariants`, `cn`, and `COLUMN_COLORS` dot classes
  so the mock matches the live board.
- Violet accent (`from-violet-*`) reserved for the AI element, consistent with
  `ai-assistant-modal.tsx` and the floating AI button.
- Copy stays Indonesian.
- Responsive: hero centered; preview horizontally clipped on mobile; feature
  grid `sm:grid-cols-2 lg:grid-cols-3`.

## Non-goals (YAGNI)

- No interactivity in the preview (decorative only).
- No live data, no A/B logic, no animation library.
