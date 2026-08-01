# Landing Page — Job Tracker Showcase Section

Date: 2026-08-01
Status: Approved

## Goal

Add a new marketing section to the landing page that showcases the Job Tracker
feature with a crisp, colorful, lightly-animated Kanban board preview plus four
feature highlights. Drive signups.

## Placement & wiring

- New section `JobTrackerShowcase` rendered after `HowItWorks`, before
  `TemplatesShowcase`, in `app/page.tsx` (lazy-loaded via `dynamic()` like the
  other sections).
- Add nav link `{ href: "#job-tracker", label: "Job Tracker" }` in
  `features/marketing/components/navbar.tsx`, inserted after "Cara Kerja".
- New component file: `features/marketing/components/job-tracker-showcase.tsx`.

## Component behaviour

- Self-contained and hardcoded: does NOT touch the CV/job-tracker Zustand store
  or tRPC. Safe to render on the public marketing page.
- Reuses existing marketing primitives: `SectionHeading`, `Reveal`, and the
  `useCycle` animation pattern from `feature-mocks.tsx`.
- Uses the real `COLUMN_COLORS` map from
  `features/job-tracker/lib/column-colors.ts` so column dots match the product.
- Does NOT reuse `BoardPreview` (that one is intentionally blurred + locked for
  the free-plan upsell). This one is crisp and colorful.

### Layout

1. `SectionHeading` — eyebrow "Job Tracker", title, description.
2. Centerpiece: mock Kanban board with 4 columns (Dilamar / Interview / Offer /
   Diterima) and realistic application cards. Light interactivity:
   - One card periodically animates moving between columns.
   - Cards lift slightly on hover.
   - All motion pauses under `prefers-reduced-motion`.
3. Feature highlights grid (4 items, icon + title + one line):
   - Kanban pipeline
   - AI follow-up email
   - Statistik & insight (shows a mini realistic funnel)
   - Ekspor CSV
4. CTA "Coba Job Tracker gratis" → `/signup`.

## Constraints

- Indonesian copy, consistent with existing landing copy.
- Animations use existing `globals.css` mock keyframes + `useCycle`; respect
  reduced-motion.
- No new dependencies.

## Out of scope

- No real data, no backend, no changes to the job-tracker feature itself.
