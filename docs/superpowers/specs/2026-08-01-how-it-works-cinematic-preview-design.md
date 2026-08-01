# Landing Page - Cinematic How It Works Previews

Date: 2026-08-01
Status: Approved

## Goal

Make the right-hand preview stage in `#cara-kerja` visually compelling through
a cinematic, layered product-demo presentation, while accurately reflecting the
real Zyvo onboarding, personal-data editor, and export UI.

## Current State

`HowItWorks` provides a sticky desktop preview stage and stacked mobile cards.
`StepPreviewMock` supplies three self-contained mockups. The current mockups
use selected real components (`CvThumbnail`) but include incomplete template
coverage and an ATS scan success label that is not a product result.

## Visual Direction

- Preserve the existing browser-like stage in `how-it-works.tsx`.
- Give each preview depth with a contained indigo glow, layered cards, stronger
  shadows, and restrained scale/translate animation.
- Use only small, purposeful motion: selected template movement, active-field
  focus, and export-state progression. All cosmetic animation is disabled for
  `prefers-reduced-motion`.
- Keep mobile to one focused composition per preview; decorative secondary
  layers may be hidden when space is constrained.

## Product-Accurate Preview Mapping

### Pilih template

- Use template IDs and display names from the real `TEMPLATES` registry.
- Use `CvThumbnail` and each template's actual default colors and typography.
- Keep the onboarding category labels and visual selection behavior consistent
  with `StepChooseTemplate`.
- A selected-template label is presentation-only and must not imply the user
  has completed onboarding.

### Isi data Anda

- Mirror `PersonalForm` fields and labels: Nama, Posisi, Email, No. HP, and
  Alamat.
- Show an autosave status using wording and states from `SaveIndicator` only:
  "Ada perubahan...", "Menyimpan...", and "Tersimpan".
- Do not show AI-generated copy or suggestions in this personal-information
  panel because the production panel does not provide them there.

### Unduh & kirim

- Mirror `ExportPanel` copy and states for PDF and PNG:
  "Unduh PDF", "Unduh PNG", and "Menyiapkan...".
- Keep the production explanation that downloading uses the last saved version.
- Do not claim a successful ATS scan. The marketing statement that templates
  are ATS-friendly remains outside this simulated export workflow.

## Architecture

- Keep `HowItWorks`, `useScrollStep`, section order, and the left-side step
  navigation unchanged.
- Refine `features/marketing/components/step-previews.tsx` as the isolated
  preview surface.
- Add narrowly scoped global keyframes/utilities to `app/globals.css` only when
  Tailwind utilities cannot express the required repeated animation.
- Do not add dependencies, product state, tRPC calls, or simulated interactions
  that can be mistaken for functional editor controls.

## Accessibility

- Preview stages remain `aria-hidden` because equivalent product-step meaning is
  supplied by the visible left-side content.
- Decorative movement honors reduced-motion preferences.
- Maintain sufficient contrast for preview labels and selected states.

## Verification

- Run `bun lint` and the existing `use-scroll-step` test.
- Check desktop and mobile rendering in the local browser.
- Compare all labels, field names, template names, and export states to their
  source components before considering the work complete.
