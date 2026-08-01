# Landing Page — How It Works Scroll-Jack Section

Date: 2026-08-01
Status: Approved

## Goal

Redesign the `#cara-kerja` (How It Works) landing section from a static 3-column
grid into a split layout: steps on the left, a sticky live preview on the right.
Scrolling advances the active step, giving a guided walkthrough of the editor.

## Current state

`features/marketing/components/how-it-works.tsx` renders a centered
`SectionHeading` + 3-column grid of `STEPS` (Isi data / Pilih template / Unduh &
kirim). Preview mocks already exist in `features/marketing/components/feature-mocks.tsx`:
`AiToolbarMock`, `ColorPresetsMock`, `TypographyMock`, `ExportMock`, `AtsBadgeMock`,
`SaveIndicatorMock`.

## Layout & behaviour

- Section `#cara-kerja` becomes `h-[300vh]` (one viewport per step). An inner
  container is `sticky top-0 h-screen` and holds a 2-column grid (`lg` and up).
- **Left**: 3 step cards — number badge, icon, title, description. The active
  card is visually prominent (primary border/tint), inactive cards dim.
  Cards are clickable: clicking scrolls to that step's position in the scroll
  region.
- **Right**: sticky preview stage with fixed height (`h-[420px]`). Renders the
  active step's mock as an absolutely-positioned panel; panels crossfade with a
  slight translateY when the active step changes.
- **Driver**: new hook `useScrollStep` measures the section rect and maps scroll
  progress `(scrollY - sectionTop) / sectionHeight` to an active index via a
  scroll/resize listener (rAF-throttled). Pure position→index: no per-step math
  beyond `floor(progress * steps.length)`.
- **Reduced motion**: step index still advances (content change, not decoration)
  but crossfade/translate animations are skipped.
- **Mobile** (`< lg`): single column — each step card rendered with its preview
  beneath it, no sticky container, no scroll-jack. Existing card styles reused.

## Step → preview mapping

1. **Isi data Anda** → `AiToolbarMock`
2. **Pilih template** → `ColorPresetsMock` + `TypographyMock`
3. **Unduh & kirim** → `ExportMock` + `AtsBadgeMock`

## Files

- `features/marketing/components/how-it-works.tsx` — rewrite (client component).
- `features/marketing/hooks/use-scroll-step.ts` — new scroll-progress hook.
- Reuses `feature-mocks.tsx`, `Reveal`, `SectionHeading`.

## Accessibility

- Active step card gets `aria-current="step"`.
- Preview panels are decorative → `aria-hidden`.

## Constraints

- Indonesian copy, unchanged from current `STEPS`.
- No new dependencies.
- Reuses existing mock keyframes / reduced-motion guards.

## Out of scope

- No changes to real editor, templates, or export features.
- No backend or data changes.
