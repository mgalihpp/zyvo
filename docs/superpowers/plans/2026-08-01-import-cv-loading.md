# Import CV Loading UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous CV-import wait state with an immediate, accessible three-stage progress card that retains the selected file context.

**Architecture:** Keep mutation phase ownership in `OnboardingWizardInner` and let `StepImportCv` request the local `reading` transition before extracting text. `StepImportCv` stores only display metadata for the selected file and renders stage state from the shared `ImportPhase`; a small pure helper makes stage-state behavior independently testable without adding a browser test dependency.

**Tech Stack:** React 19.2, Next.js 16 App Router, TypeScript, Tailwind CSS v4, Lucide React, Bun test, Biome

## Global Constraints

- Preserve existing file validation, text extraction, AI import, CV creation, navigation, and error copy.
- Show the real stages `Membaca file`, `Menganalisis CV dengan AI`, and `Menyiapkan builder` without percentages or time estimates.
- Paste import starts at `analyzing` and does not show file metadata.
- Keep navigation and import controls disabled while processing.
- Do not add a reusable global progress component or a new dependency.
- Use a live status region and hide decorative icons from assistive technology.

---

## File Structure

- Modify `features/onboarding/components/step-import-cv.tsx`: export the shared phase type and pure stage-state helper, manage selected file metadata, signal extraction phase changes, and render the progress card.
- Modify `features/onboarding/components/onboarding-wizard.tsx`: import the shared phase type and pass a phase-change callback to `StepImportCv`.
- Create `features/onboarding/components/step-import-cv.test.ts`: verify stage-state mapping without introducing a DOM test framework.

### Task 1: Import Progress State And UI

**Files:**
- Create: `features/onboarding/components/step-import-cv.test.ts`
- Modify: `features/onboarding/components/step-import-cv.tsx:3-178`
- Modify: `features/onboarding/components/onboarding-wizard.tsx:20-25,78-80,246-264,351-357`

**Interfaces:**
- Produces: `export type ImportPhase = "idle" | "reading" | "analyzing" | "creating"`
- Produces: `getImportStageState(phase: Exclude<ImportPhase, "idle">, stage: Exclude<ImportPhase, "idle">): "complete" | "active" | "upcoming"`
- Extends `StepImportCv` props with `onPhaseChange: (phase: ImportPhase) => void`
- Preserves: `onImport(text: string): void`, `error: string | null`, and `onClearError(): void`

- [ ] **Step 1: Write the failing stage-state test**

Create `features/onboarding/components/step-import-cv.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  getImportStageState,
  type ImportPhase,
} from "./step-import-cv";

const stages = ["reading", "analyzing", "creating"] as const;

describe("getImportStageState", () => {
  test.each([
    ["reading", ["active", "upcoming", "upcoming"]],
    ["analyzing", ["complete", "active", "upcoming"]],
    ["creating", ["complete", "complete", "active"]],
  ] as const)("maps %s to ordered stage states", (phase, expected) => {
    const actual = stages.map((stage) => getImportStageState(phase, stage));
    expect(actual).toEqual(expected);
  });

  test("accepts every busy import phase", () => {
    const phase: Exclude<ImportPhase, "idle"> = "reading";
    expect(getImportStageState(phase, "reading")).toBe("active");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun test features/onboarding/components/step-import-cv.test.ts`

Expected: FAIL because `ImportPhase` and `getImportStageState` are not exported.

- [ ] **Step 3: Add the shared phase model and stage-state helper**

In `features/onboarding/components/step-import-cv.tsx`, export `ImportPhase`, add ordered stage metadata, and implement the pure comparison:

```ts
export type ImportPhase = "idle" | "reading" | "analyzing" | "creating";
type BusyImportPhase = Exclude<ImportPhase, "idle">;

const IMPORT_STAGES: ReadonlyArray<{
  id: BusyImportPhase;
  label: string;
}> = [
  { id: "reading", label: "Membaca file" },
  { id: "analyzing", label: "Menganalisis CV dengan AI" },
  { id: "creating", label: "Menyiapkan builder" },
];

export function getImportStageState(
  phase: BusyImportPhase,
  stage: BusyImportPhase,
): "complete" | "active" | "upcoming" {
  const phaseIndex = IMPORT_STAGES.findIndex((item) => item.id === phase);
  const stageIndex = IMPORT_STAGES.findIndex((item) => item.id === stage);
  if (stageIndex < phaseIndex) return "complete";
  if (stageIndex === phaseIndex) return "active";
  return "upcoming";
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `bun test features/onboarding/components/step-import-cv.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 5: Wire the real `reading` transition and file metadata**

In `StepImportCv`, add `onPhaseChange` to the props and store the selected display metadata:

```ts
type SelectedFile = { name: string; size: number };

const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

async function handleFile(file: File) {
  setExtractError(null);
  onClearError();
  setSelectedFile({ name: file.name, size: file.size });
  onPhaseChange("reading");
  try {
    const text = await extractTextFromFile(file);
    onImport(text);
  } catch (err) {
    onPhaseChange("idle");
    setSelectedFile(null);
    // Preserve the existing ExtractError and fallback branches unchanged.
  }
}
```

Clear stale metadata when a parent-owned request fails by adding an effect keyed to `phase` and `error`:

```ts
useEffect(() => {
  if (phase === "idle" && error) setSelectedFile(null);
}, [phase, error]);
```

Import `useEffect`, and leave pasted-text submission unchanged so it calls `onImport` directly without entering `reading`.

- [ ] **Step 6: Replace the busy skeleton with the staged progress card**

Import `Check`, `FileText`, and `LoaderCircle` from `lucide-react`; remove the unused `Skeleton` import. Add a local formatter:

```ts
function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
```

For `busy`, render a bordered primary-tinted card with `role="status"` and `aria-live="polite"`. Include:

```tsx
{selectedFile && (
  <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-background/80 p-3 text-left">
    <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{selectedFile.name}</p>
      <p className="text-xs text-muted-foreground">
        {formatFileSize(selectedFile.size)}
      </p>
    </div>
  </div>
)}
```

Map `IMPORT_STAGES`; derive each `state` with `getImportStageState(phase, stage.id)`. Render a `Check` for `complete`, an animated `LoaderCircle` for `active`, and an empty muted dot for `upcoming`, all with `aria-hidden="true"`. Use normal foreground text for complete/active labels and muted text for upcoming labels. End the card with `Jangan tutup halaman ini. Proses AI dapat memakan waktu beberapa detik.`

When pasted text is processing, omit the file row but show the same three stages; `reading` will appear complete because the active phase is `analyzing`.

- [ ] **Step 7: Connect the child phase callback to the wizard**

In `onboarding-wizard.tsx`, import the type from the dynamically loaded component module and remove the duplicate local type:

```ts
import type { ImportPhase } from "@/features/onboarding/components/step-import-cv";
```

Pass the state setter callback to the component:

```tsx
<StepImportCv
  onImport={handleImport}
  phase={importPhase}
  onPhaseChange={setImportPhase}
  error={importError}
  onClearError={() => setImportError(null)}
/>
```

Keep `handleImport` responsible for `analyzing`, `creating`, and resetting to `idle` on mutation errors.

- [ ] **Step 8: Run focused and project verification**

Run: `bun test features/onboarding/components/step-import-cv.test.ts`

Expected: PASS.

Run: `bun lint features/onboarding/components/step-import-cv.tsx features/onboarding/components/step-import-cv.test.ts features/onboarding/components/onboarding-wizard.tsx`

Expected: PASS with no Biome diagnostics in the touched files.

Run: `bun build`

Expected: successful Next.js production build and TypeScript validation.

- [ ] **Step 9: Manually verify the import flow**

Run: `bun dev`

At `/builder/new?step=3&method=import&template=classic`, verify:

- Selecting and dropping a PDF/DOCX immediately shows its name, size, and active `Membaca file` stage.
- The active indicator advances to AI analysis and then builder creation; completed stages retain check icons.
- Back, cancel/skip, and tab controls cannot trigger duplicate navigation while busy.
- An invalid or unreadable file restores the input and existing error message.
- A server-side import failure restores the input and allows retrying the same file.
- Paste import starts at AI analysis and does not show a file row.
- The card remains readable without horizontal overflow at narrow mobile widths and at the reported 1536x782 viewport.

- [ ] **Step 10: Commit the focused change**

```bash
git add features/onboarding/components/step-import-cv.tsx features/onboarding/components/step-import-cv.test.ts features/onboarding/components/onboarding-wizard.tsx docs/superpowers/specs/2026-08-01-import-cv-loading-design.md docs/superpowers/plans/2026-08-01-import-cv-loading.md
git commit -m "feat(onboarding): improve CV import loading state"
```
