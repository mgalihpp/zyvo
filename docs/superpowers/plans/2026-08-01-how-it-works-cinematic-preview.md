# Cinematic How It Works Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat right-hand How It Works mockups with cinematic, layered previews that remain faithful to Zyvo's real product UI.

**Architecture:** Keep the sticky section and scroll hook unchanged. Refactor only the isolated preview component, sourcing template metadata from the production registry and reproducing production personal-form, autosave, and export labels/states; add scoped CSS animation primitives only where needed.

**Tech Stack:** React 19.2, Next.js 16, Tailwind CSS v4, lucide-react, Biome, Bun test.

## Global Constraints

- No new dependencies.
- Do not change `HowItWorks`, `useScrollStep`, backend behavior, or product state.
- Template IDs and names must come from the production `TEMPLATES` registry.
- Personal-data and export labels/states must match the production source components.
- Do not present an ATS scan as a product result.
- Cosmetic animation must honor `prefers-reduced-motion`.

---

### Task 1: Product-Accurate Cinematic Previews

**Files:**
- Modify: `features/marketing/components/step-previews.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `TEMPLATES`, `CvThumbnail`, `SAMPLE_CV`, template defaults, and `cn`.
- Produces: unchanged `StepPreviewMock({ variant }: { variant: "template" | "data" | "export" })`.

- [ ] **Step 1: Add production-source constants and preview state**

Use `TEMPLATES.slice(0, 4)` for template metadata. Define personal fields from
`PersonalForm` labels and export formats from `ExportPanel` labels/subtitles.
Keep cyclical state decorative and return static state for reduced motion.

- [ ] **Step 2: Build the template composition**

Render actual `CvThumbnail` output in a layered stack, with the active real
template centered and inactive real templates offset behind it. Retain category
chips from onboarding and show the selected registry name.

- [ ] **Step 3: Build the personal-data composition**

Render a compact production-like panel with real labels and sample values.
Cycle field focus and autosave wording through `Ada perubahan...`,
`Menyimpan...`, and `Tersimpan`; do not invent AI suggestions.

- [ ] **Step 4: Build the export composition**

Render a true CV thumbnail beside a compact replica of `ExportPanel`. Animate
only `Menyiapkan...` and completion back to the normal production option state.
Do not show ATS score or scan-success messaging.

- [ ] **Step 5: Add scoped cinematic animation**

Add reusable keyframes for slow stage glow and floating cards. Disable them in
`@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 6: Format and lint**

Run: `bunx biome check --write features/marketing/components/step-previews.tsx app/globals.css`

Run: `bun lint`

Expected: both commands exit successfully.

### Task 2: Regression Verification

**Files:**
- Test: `features/marketing/hooks/use-scroll-step.test.ts`

**Interfaces:**
- Consumes: existing preview export and scroll mapping.
- Produces: verified unchanged scroll behavior and build compatibility.

- [ ] **Step 1: Run focused tests**

Run: `bun test features/marketing/hooks/use-scroll-step.test.ts`

Expected: 3 tests pass.

- [ ] **Step 2: Run production build**

Run: `bun build`

Expected: Next.js production build succeeds with no type errors.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check`

Expected: no whitespace errors; application changes are limited to the preview
component and scoped global animations.
