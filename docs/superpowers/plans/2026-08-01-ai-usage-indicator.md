# AI Usage Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable hover/click AI usage indicator showing monthly quota consumption, remaining calls, progress, and upgrade guidance at each AI entry point.

**Architecture:** Keep quota calculation in the existing `trpc.ai.quotaStatus` procedure. Add one client-side `AiUsageIndicator` that reads that procedure and renders a `HoverCard` with a `Progress` bar; integrate the indicator into existing AI controls without adding new backend state or changing quota enforcement.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC v11, shadcn/base-ui `HoverCard` and `Progress`, lucide-react, Tailwind CSS v4, Bun test, Biome.

## Global Constraints

- Use the existing `trpc.ai.quotaStatus` response `{ used: number; limit: number | null }`; do not add a second quota source.
- Keep `features/billing/server/entitlements.ts` as the owner of quota calculation and enforcement.
- Use Indonesian UI copy consistent with the existing product: `Kuota AI`, `dipakai`, `sisa`, and `bulan ini`.
- Query failures and loading must not block or alter the existing AI forms and buttons.
- Pro users (`limit === null`) must see an unlimited message instead of a progress calculation.
- Limited plans must show progress, used/limit, remaining calls, and monthly reset copy.
- Exhausted plans must show destructive progress styling and link to `/dashboard/billing`.

## File Map

- Create: `features/ai/components/ai-usage-indicator.tsx` — reusable client indicator and popover content.
- Modify: `features/ai/components/ai-panel.tsx` — replace the existing text-only quota line.
- Modify: `features/ai/components/ai-toolbar.tsx` — add usage indicator beside inline AI actions.
- Modify: `features/ai/components/ai-generator-modal.tsx` — add indicator beside the generator CTA.
- Modify: `features/onboarding/components/step-ai-generator.tsx` — add indicator beside the onboarding CTA.
- Modify: `features/job-tracker/components/ai-assistant-modal.tsx` — add indicator beside the assistant title.
- Optional modify: `features/ai/components/ai-quota-line.tsx` — delete only if no remaining imports after the panel integration; do not leave dead code without checking usages.

## Task 1: Build The Reusable Indicator

**Files:**
- Create: `features/ai/components/ai-usage-indicator.tsx`

**Interfaces:**
- Consumes: `trpc.ai.quotaStatus.useQuery()` and optional `className`, `align`, and `side` positioning props.
- Produces: `AiUsageIndicator` React component that can be rendered beside any AI control without receiving quota data from its parent.

- [ ] **Step 1: Define the component contract and query state**

  Create a client component with a props type that accepts `className` and the positioning values supported by `HoverCardContent` (`align` and `side`). Call `trpc.ai.quotaStatus.useQuery()` with the existing default behavior. Do not add a mutation or local quota state.

- [ ] **Step 2: Render the accessible icon trigger**

  Use `HoverCard`, `HoverCardTrigger`, and `HoverCardContent`. Render a `Button` with `variant="ghost"`, `size="icon-xs"`, `type="button"`, and an accessible label such as `Lihat penggunaan AI`. Use an info/sparkles icon and pass the supplied `className` to the button so hosts can align it inline.

- [ ] **Step 3: Render limited-plan usage content**

  When query data has a numeric limit, calculate `remaining = Math.max(0, limit - used)` and `percentage = limit === 0 ? 0 : Math.min(100, (used / limit) * 100)`. Render:

  ```tsx
  <h3>Kuota AI</h3>
  <Progress
    value={percentage}
    className={used >= limit ? "[&_[data-slot=progress-indicator]]:bg-destructive" : undefined}
  />
  <p>{used} dari {limit} dipakai</p>
  <p>Sisa {remaining} panggilan bulan ini</p>
  <p>Reset tiap awal bulan</p>
  ```

  Use `tabular-nums` for numeric copy and keep the content compact enough for the existing 18rem hover-card width.

- [ ] **Step 4: Render unlimited and exhausted states**

  For `limit === null`, render `Kuota AI tanpa batas bulan ini` and omit the progress bar. For a numeric limit where `used >= limit`, keep the remaining value at zero, apply destructive styling to the progress indicator, render `Kuota AI bulan ini habis`, and include a `Link` to `/dashboard/billing` with upgrade copy.

- [ ] **Step 5: Keep loading and errors non-disruptive**

  Always render the icon trigger, but render no hover content while `isLoading` or `isError` is true. This preserves the control's layout and ensures quota read failures do not prevent the user from using AI.

- [ ] **Step 6: Run focused static verification**

  Run `bunx biome check features/ai/components/ai-usage-indicator.tsx`. Expected: no diagnostics.

## Task 2: Replace The Builder Text Readout

**Files:**
- Modify: `features/ai/components/ai-panel.tsx:5-23`
- Inspect/delete: `features/ai/components/ai-quota-line.tsx`

**Interfaces:**
- Consumes: `AiUsageIndicator` from Task 1.
- Produces: The builder AI panel exposes the same usage information through the reusable icon instead of a separate text-only line.

- [ ] **Step 1: Replace the `AiQuotaLine` import and render**

  Import `AiUsageIndicator`, remove the `AiQuotaLine` import, and place the indicator in a compact row below the tabs or next to the tab controls without changing the existing tab content layout.

- [ ] **Step 2: Check for remaining quota-line usages**

  Run `rg "AiQuotaLine|ai-quota-line" features app`. If there are no usages, remove `features/ai/components/ai-quota-line.tsx`; otherwise retain it and ensure there is no duplicate quota presentation in the panel.

- [ ] **Step 3: Run lint on the changed files**

  Run `bunx biome check features/ai/components/ai-panel.tsx features/ai/components/ai-quota-line.tsx` (omit the deleted file if it was removed). Expected: no diagnostics.

## Task 3: Add Indicators To CV AI Entry Points

**Files:**
- Modify: `features/ai/components/ai-toolbar.tsx:76-108`
- Modify: `features/ai/components/ai-generator-modal.tsx:118-136`
- Modify: `features/onboarding/components/step-ai-generator.tsx:65-75`

**Interfaces:**
- Consumes: `AiUsageIndicator` from Task 1.
- Produces: Every CV editor/generator CTA has a nearby usage affordance while retaining all existing button behavior and validation.

- [ ] **Step 1: Add the indicator to `AiToolbar`**

  Import `AiUsageIndicator` and append it to the existing flex row after the AI action buttons. Keep the undo button and action button disabled/loading logic unchanged.

- [ ] **Step 2: Add the indicator beside the generator modal CTA**

  Wrap the two modal footer buttons in a flex container if needed, then render `AiUsageIndicator` next to `Buat dengan AI`. Preserve the existing `handleGenerate`, `isPending`, close, and validation behavior.

- [ ] **Step 3: Add the indicator beside the onboarding CTA**

  Wrap the onboarding `Buat dengan AI` button and the indicator in a row or stack that remains full width on mobile. Do not change the `onGenerate` payload or `canSubmit` condition.

- [ ] **Step 4: Run targeted lint**

  Run `bunx biome check features/ai/components/ai-toolbar.tsx features/ai/components/ai-generator-modal.tsx features/onboarding/components/step-ai-generator.tsx`. Expected: no diagnostics.

## Task 4: Add Indicator To Job Tracker AI Assistant

**Files:**
- Modify: `features/job-tracker/components/ai-assistant-modal.tsx:340-347`

**Interfaces:**
- Consumes: `AiUsageIndicator` from Task 1.
- Produces: The job tracker AI assistant title area exposes the same monthly quota information for all three assistant tabs.

- [ ] **Step 1: Add the indicator to the modal header**

  Import `AiUsageIndicator` and render it beside `Asisten AI Lamaran` in the existing `DialogTitle` row. Use a suitable alignment/side value so the hover card stays inside the modal viewport.

- [ ] **Step 2: Preserve assistant behavior**

  Do not change any of the three mutation handlers, context fields, tab controls, or quota invalidation callbacks. The indicator must be informational only.

- [ ] **Step 3: Run targeted lint**

  Run `bunx biome check features/job-tracker/components/ai-assistant-modal.tsx`. Expected: no diagnostics.

## Task 5: Verify The Complete Feature

**Files:**
- Modify: none unless verification exposes an issue.

**Interfaces:**
- Consumes: all implementation tasks above.
- Produces: verified free/basic/unlimited/exhausted presentation and a clean production build.

- [ ] **Step 1: Run the existing test suite**

  Run `bun test`. Expected: all existing tests pass; no backend quota behavior changes are introduced.

  Note: the repository does not currently include a React/DOM component-test
  harness (`*.test.tsx` is absent), so the indicator's visual and interaction
  states are covered by the manual verification step and the production build.

- [ ] **Step 2: Run repository lint**

  Run `bun lint`. Expected: Biome reports no errors in the repository.

- [ ] **Step 3: Run the production build**

  Run `bun build`. Expected: Next.js production build completes successfully.

- [ ] **Step 4: Manually verify the UI states**

  With a limited-plan account, inspect an indicator near the AI toolbar, generator CTA, and job tracker assistant. Confirm the hover/focus/touch interaction shows progress, used/limit, remaining, and reset copy. Confirm the exhausted state shows zero remaining and the billing link. With a Pro account, confirm the indicator says unlimited and has no progress bar.
