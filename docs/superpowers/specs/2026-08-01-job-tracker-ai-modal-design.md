# Job Tracker AI Assistant Modal — Design

Date: 2026-08-01
Branch: `feat/job-tracker`
Status: Approved

## Goal

Move the AI features **Surat Lamaran** (cover letter) and **Interview Prep** out of the CV builder's AI panel and into the job tracker, together with **Analisis Lowongan** (JD analysis), presented as one wide, visually attractive tabbed modal triggered by a floating action button (FAB) on the job tracker page.

## Decisions (from brainstorming)

- CV source: **CV picker inside the modal** (job tracker has no cv-store), defaulting to the selected application's linked `cvId`.
- JD source: **new `jobDescription` field on `JobApplication`**, with a manual-paste textarea fallback (session-only, not persisted).
- Shape: **one wide modal (`sm:max-w-4xl`) with tabs**; context (application + CV) picked once, shared across tabs.
- Trigger: **global FAB** on the job tracker page (no per-card trigger).
- Builder: Surat Lamaran & Interview Prep are **removed** from the builder `AiPanel` (moved, not duplicated). `AiScoreCard`, `AiJdAnalyzer`, `AiChat` stay.
- Backend: **reuse existing tRPC procedures** `ai.coverLetter`, `ai.interviewPrep`, `ai.analyzeJD` unchanged.

## 1. Data model: `jobDescription`

- Prisma `JobApplication`: add `jobDescription String?` (MongoDB — optional field, no migration needed; old docs read as `null`).
- Zod (`features/job-tracker/schemas/job-tracker.ts`): `jobDescription: z.string().max(3000).optional()` — cap matches `analyzeJD.jdText` limit.
- `ApplicationDialog`: textarea "Deskripsi Lowongan (opsional)" below notes.
- `job-tracker-router.ts`: pass the field through create/update.

## 2. Context building (CV snapshot)

- List CVs via the existing tRPC cv list query (title + id) for the picker.
- On CV selection, fetch full CV content via the existing getById query, then build the snapshot with `buildSnapshot` from `features/ai/lib/cv-snapshot` — it is a pure function over content, usable without the cv-store.
- Picker default: selected application's `cvId` if set, else the first CV.
- JD comes from the selected application's `jobDescription`; if empty, a manual-paste textarea appears (not saved to DB).

## 3. AI Assistant Modal

New component `features/job-tracker/components/ai-assistant-modal.tsx`, lazy-loaded from `job-tracker-page.tsx`. `DialogContent` with `scrollable` and `sm:max-w-4xl`.

Layout:

- **Sticky context header**: two side-by-side pickers — Application ("Company — Position") and CV. Below them, a status chip "JD: tersedia / tidak ada"; when absent, the manual-paste textarea shows.
- **Tabs** (existing `tabs.tsx`): Surat Lamaran | Interview Prep | Analisis Lowongan.
  - **Surat Lamaran**: tone selector (formal/casual/creative, segmented), Generate button (`Button` loading/loadingText), result in a text area with Copy button. Calls `ai.coverLetter`.
  - **Interview Prep**: Generate button → list of question cards (question + tip), accordion/numbered list. Calls `ai.interviewPrep`.
  - **Analisis Lowongan**: requires JD (button disabled with hint when JD empty). Result: large score (ring/number), matched keywords as green badges, gaps as amber badges, recommendations as bullets. Calls `ai.analyzeJD`.
- Per-tab results held in local modal state — preserved when switching tabs, reset when application or CV changes.
- Errors: page is already plan-gated, so FORBIDDEN cannot occur here; AI rate-limit/errors shown as inline error messages per tab.

## 4. Floating action button

In `job-tracker-page.tsx`: `fixed bottom-6 right-6`, round, Sparkles icon only (no text label), violet gradient accent. Rendered only when the board query succeeds (not on `UpsellView`). Click opens the modal with no pre-selected application (picker defaults to first application / empty).

## 5. Builder cleanup

In `features/ai/components/ai-panel.tsx`: remove the Surat Lamaran & Interview Prep button grid, the `AiCoverLetterModal`/`AiInterviewModal` renders, and their open-state. Delete `ai-cover-letter-modal.tsx` and `ai-interview-modal.tsx` (logic is rebuilt inside the job tracker modal). Prompts and tRPC procedures unchanged.

## Testing

- Zod schema: `jobDescription` accepted/optional, >3000 chars rejected.
- Router: create/update round-trips `jobDescription`.
- Modal behavior (component-level or manual): default CV = application's `cvId`; JD fallback textarea appears only when application has no `jobDescription`; Analisis tab disabled without JD; results reset on context change.
- Builder: AI panel renders without the removed buttons; no dangling imports (lint/build pass).

## Out of scope

- Per-card/detail-sheet AI shortcuts.
- Persisting generated outputs (cover letters, questions, analysis) to the database.
- Changes to AI prompts or rate limiting.
