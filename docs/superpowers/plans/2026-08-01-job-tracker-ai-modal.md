# Job Tracker AI Assistant Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the AI features Surat Lamaran, Interview Prep, and Analisis Lowongan into a wide tabbed modal in the job tracker, triggered by a violet FAB, and remove Surat Lamaran / Interview Prep from the builder AI panel.

**Architecture:** New `jobDescription` field on `JobApplication` (Prisma + zod + form). New lazy-loaded `AiAssistantModal` in `features/job-tracker/components/` with application + CV pickers in a shared context header and three tabs, each calling the existing `trpc.ai.*` procedures with a snapshot built via `buildSnapshot` from a fetched CV (`trpc.cv.getById`), not the cv-store. Builder `AiPanel` loses its two modal buttons and the two modal files are deleted.

**Tech Stack:** Next.js 16, React 19.2, tRPC v11, Prisma (MongoDB), Base UI dialog/tabs, Tailwind v4, Biome, bun.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-job-tracker-ai-modal-design.md`
- No test runner in repo — verification per task is `bun lint` + `bunx tsc --noEmit` (plus `bun db:generate` after Prisma changes).
- UI copy in Indonesian, matching existing components.
- Always use `Button` `loading`/`loadingText` props for async buttons.
- `jobDescription` capped at 3000 chars (matches `ai.analyzeJD` `jdText` limit).
- Do NOT change `features/ai/server/ai-router.ts`, prompts, or rate limiting.
- FAB: icon-only (Sparkles), violet gradient.
- Commit after each task.

---

### Task 1: `jobDescription` field (Prisma + zod + router + form)

**Files:**
- Modify: `prisma/schema.prisma` (model JobApplication, ~line 274 after `notes`)
- Modify: `features/job-tracker/schemas/job-tracker.ts` (applicationInputSchema)
- Modify: `features/job-tracker/components/application-dialog.tsx`
- (No router change needed: `createApplication`/`updateApplication` spread the validated input, so adding the field to the zod schema flows through automatically. Verify this while implementing.)

**Interfaces:**
- Produces: `JobApplication.jobDescription: string | null` (Prisma), `applicationInputSchema.jobDescription?: string` (max 3000). Task 3 reads `app.jobDescription`.

- [ ] **Step 1: Add Prisma field**

In `prisma/schema.prisma`, inside `model JobApplication`, after `notes        String?` add:

```prisma
  jobDescription String? // pasted JD text, used by AI assistant modal
```

- [ ] **Step 2: Regenerate Prisma Client**

Run: `bun db:generate`
Expected: success. (Do NOT run `db:push` unless the user asks — MongoDB needs no migration for an optional field; `db:push` only syncs indexes.)

- [ ] **Step 3: Add zod field**

In `features/job-tracker/schemas/job-tracker.ts`, inside `applicationInputSchema` after `notes`:

```ts
  jobDescription: z.string().max(3000).optional(),
```

- [ ] **Step 4: Add form field to ApplicationDialog**

In `features/job-tracker/components/application-dialog.tsx`:

1. `formSchema`: after `notes` add `jobDescription: z.string().max(3000).optional(),`
2. `toPayload`: add `jobDescription: values.jobDescription || undefined,`
3. `defaultsFor`: add `jobDescription: ""` in the empty branch and `jobDescription: application.jobDescription ?? ""` in the edit branch.
4. After the `notes` Controller, add:

```tsx
          <Controller
            name="jobDescription"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Deskripsi Lowongan
                </FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  placeholder="Paste deskripsi lowongan di sini — dipakai untuk fitur AI (opsional)"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
```

- [ ] **Step 5: Verify**

Run: `bun lint` then `bunx tsc --noEmit`
Expected: both pass (pre-existing "Props must be serializable" warnings in kanban files are known and acceptable).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma features/job-tracker/schemas/job-tracker.ts features/job-tracker/components/application-dialog.tsx
git commit -m "feat: jobDescription field on job applications"
```

---

### Task 2: CV snapshot hook for job tracker

**Files:**
- Create: `features/job-tracker/hooks/use-cv-snapshot.ts`

**Interfaces:**
- Consumes: `buildSnapshot(cv: CvContent): string` from `@/features/ai/lib/cv-snapshot`; `trpc.cv.getById` (returns full CV row whose section fields form a `CvContent`).
- Produces: `useCvSnapshot(cvId: string | undefined): { snapshot: string | undefined; isLoading: boolean }` — Task 3 calls this.

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import type { CvContent } from "@/features/cv/schemas/cv";
import { trpc } from "@/lib/trpc/client";

/** Fetch a CV by id and serialize it for AI prompts. No cv-store needed. */
export function useCvSnapshot(cvId: string | undefined) {
  const { data: cv, isLoading } = trpc.cv.getById.useQuery(
    { id: cvId ?? "" },
    { enabled: Boolean(cvId), staleTime: 60_000 },
  );

  const snapshot = cv ? buildSnapshot(cv as unknown as CvContent) : undefined;

  return { snapshot, isLoading: Boolean(cvId) && isLoading };
}
```

Note: the CV row is a superset of `CvContent` (extra fields like `id`, `title` are ignored by `buildSnapshot`). If `tsc` rejects the cast differently, verify the actual `getById` return type and adapt the cast — but do not fetch anything other than `trpc.cv.getById`.

- [ ] **Step 2: Verify**

Run: `bun lint` then `bunx tsc --noEmit`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add features/job-tracker/hooks/use-cv-snapshot.ts
git commit -m "feat: useCvSnapshot hook for job tracker AI"
```

---

### Task 3: AI Assistant Modal

**Files:**
- Create: `features/job-tracker/components/ai-assistant-modal.tsx`

**Interfaces:**
- Consumes: `useCvSnapshot` (Task 2); `JobApplication.jobDescription` (Task 1); `trpc.ai.coverLetter` ({cvSnapshot, jdText?, tone}), `trpc.ai.interviewPrep` ({cvSnapshot, jdText?} → {questions: {question, tip}[]}), `trpc.ai.analyzeJD` ({jdText, cvSnapshot} → {score, matchedKeywords, gaps, recommendations}); `trpc.cv.list`; UI components `Dialog*`, `Tabs*`, `Button`, `Textarea`, and `DropdownSelectField`-style pickers (re-implement locally — the one in `application-dialog.tsx` is not exported; copy its DropdownMenu pattern).
- Produces: `AiAssistantModal({ open, onOpenChange, applications }: { open: boolean; onOpenChange: (open: boolean) => void; applications: JobApplication[] })` — Task 4 renders this.

- [ ] **Step 1: Write the component**

Full component (one file; ~sections: pickers, tab Surat Lamaran, tab Interview, tab Analisis):

```tsx
"use client";

import type { JobApplication } from "@prisma/client";
import { ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCvSnapshot } from "@/features/job-tracker/hooks/use-cv-snapshot";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface JdResult {
  score: number;
  matchedKeywords: string[];
  gaps: string[];
  recommendations: string[];
}

/** Picker built on DropdownMenu (same pattern as ApplicationDialog). */
function ContextPicker({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-between font-normal",
                !selected && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDownIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AiAssistantModal({
  open,
  onOpenChange,
  applications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: JobApplication[];
}) {
  const { data: cvs } = trpc.cv.list.useQuery(undefined, { enabled: open });

  const [appId, setAppId] = useState("");
  const [cvId, setCvId] = useState("");
  const [manualJd, setManualJd] = useState("");

  const selectedApp = applications.find((a) => a.id === appId);
  const jdText = selectedApp?.jobDescription || manualJd;

  // Default selections when the modal opens.
  useEffect(() => {
    if (!open) return;
    setAppId((prev) => prev || (applications[0]?.id ?? ""));
  }, [open, applications]);
  useEffect(() => {
    if (!open) return;
    setCvId(selectedApp?.cvId || cvs?.[0]?.id || "");
  }, [open, selectedApp?.cvId, cvs]);

  const { snapshot, isLoading: cvLoading } = useCvSnapshot(
    open ? cvId || undefined : undefined,
  );

  // Per-tab results, reset when context changes.
  const [tone, setTone] = useState<"formal" | "casual" | "creative">("formal");
  const [coverLetter, setCoverLetter] = useState("");
  const [questions, setQuestions] = useState<
    { question: string; tip: string }[]
  >([]);
  const [analysis, setAnalysis] = useState<JdResult | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on context change only
  useEffect(() => {
    setCoverLetter("");
    setQuestions([]);
    setAnalysis(null);
    setManualJd("");
  }, [appId, cvId]);

  const coverLetterMutation = trpc.ai.coverLetter.useMutation({
    onSuccess: ({ result }) => setCoverLetter(result),
  });
  const interviewMutation = trpc.ai.interviewPrep.useMutation({
    onSuccess: (data) => setQuestions(data.questions),
  });
  const analyzeMutation = trpc.ai.analyzeJD.useMutation({
    onSuccess: (data) => setAnalysis(data),
  });

  const ready = Boolean(snapshot) && !cvLoading;

  const scoreColor = !analysis
    ? ""
    : analysis.score >= 75
      ? "text-green-600"
      : analysis.score >= 50
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" scrollable>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-violet-500" />
            Asisten AI Lamaran
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context header */}
          <div className="space-y-3 rounded-xl border bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <ContextPicker
                label="Lamaran"
                value={appId}
                onChange={setAppId}
                placeholder="Pilih lamaran"
                options={applications.map((a) => ({
                  value: a.id,
                  label: `${a.company} — ${a.position}`,
                }))}
              />
              <ContextPicker
                label="CV"
                value={cvId}
                onChange={setCvId}
                placeholder="Pilih CV"
                options={
                  cvs?.map((cv) => ({ value: cv.id, label: cv.title })) ?? []
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  jdText
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {jdText ? "JD: tersedia" : "JD: tidak ada"}
              </span>
              {!cvId && (
                <span className="text-xs text-muted-foreground">
                  Pilih CV untuk mulai.
                </span>
              )}
            </div>
            {!selectedApp?.jobDescription && (
              <Textarea
                value={manualJd}
                onChange={(e) => setManualJd(e.target.value.slice(0, 3000))}
                placeholder="Lamaran ini belum punya deskripsi lowongan — paste di sini (tidak disimpan)..."
                className="min-h-[70px] resize-none text-xs"
              />
            )}
          </div>

          <Tabs defaultValue="cover-letter">
            <TabsList className="w-full">
              <TabsTrigger value="cover-letter">Surat Lamaran</TabsTrigger>
              <TabsTrigger value="interview">Interview Prep</TabsTrigger>
              <TabsTrigger value="analysis">Analisis Lowongan</TabsTrigger>
            </TabsList>

            {/* Surat Lamaran */}
            <TabsContent value="cover-letter" className="space-y-4">
              <div>
                <span className="mb-1 block text-xs font-medium">
                  Gaya penulisan
                </span>
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {(
                    [
                      ["formal", "Formal"],
                      ["casual", "Santai profesional"],
                      ["creative", "Kreatif"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={tone === value ? "default" : "ghost"}
                      className="flex-1"
                      onClick={() => setTone(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!ready}
                onClick={() =>
                  snapshot &&
                  coverLetterMutation.mutate({
                    cvSnapshot: snapshot,
                    jdText,
                    tone,
                  })
                }
                loading={coverLetterMutation.isPending}
                loadingText="Membuat surat lamaran..."
              >
                Buat Surat Lamaran
              </Button>
              {coverLetter && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Hasil:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(coverLetter)}
                    >
                      Salin
                    </Button>
                  </div>
                  <Textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="min-h-[240px] resize-none text-xs"
                  />
                </div>
              )}
              {coverLetterMutation.error && (
                <p className="text-xs text-destructive">
                  {coverLetterMutation.error.message}
                </p>
              )}
            </TabsContent>

            {/* Interview Prep */}
            <TabsContent value="interview" className="space-y-4">
              <Button
                className="w-full"
                disabled={!ready}
                onClick={() =>
                  snapshot &&
                  interviewMutation.mutate({ cvSnapshot: snapshot, jdText })
                }
                loading={interviewMutation.isPending}
                loadingText="Membuat pertanyaan..."
              >
                Generate 10 Pertanyaan Interview
              </Button>
              {questions.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {questions.map((q, i) => (
                    <div
                      key={q.question}
                      className="space-y-1.5 rounded-lg border p-3"
                    >
                      <p className="text-sm font-medium">
                        {i + 1}. {q.question}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        💡 {q.tip}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {interviewMutation.error && (
                <p className="text-xs text-destructive">
                  {interviewMutation.error.message}
                </p>
              )}
            </TabsContent>

            {/* Analisis Lowongan */}
            <TabsContent value="analysis" className="space-y-4">
              <Button
                className="w-full"
                disabled={!ready || !jdText.trim()}
                onClick={() =>
                  snapshot &&
                  analyzeMutation.mutate({
                    jdText: jdText.slice(0, 3000),
                    cvSnapshot: snapshot,
                  })
                }
                loading={analyzeMutation.isPending}
                loadingText="Menganalisis..."
              >
                Analisis Kesesuaian
              </Button>
              {!jdText.trim() && (
                <p className="text-xs text-muted-foreground">
                  Butuh deskripsi lowongan — isi di form lamaran atau paste di
                  atas.
                </p>
              )}
              {analysis && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Skor kesesuaian:
                    </span>
                    <span className={`text-3xl font-bold ${scoreColor}`}>
                      {analysis.score}%
                    </span>
                  </div>
                  {analysis.matchedKeywords.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-green-700">
                        Keyword yang cocok:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.matchedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.gaps.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-amber-700">
                        Gap yang perlu diisi:
                      </p>
                      <ul className="space-y-0.5">
                        {analysis.gaps.map((gap) => (
                          <li
                            key={gap}
                            className="text-xs text-muted-foreground"
                          >
                            • {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.recommendations.length > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-1 text-xs font-medium">Rekomendasi:</p>
                      <ul className="space-y-1">
                        {analysis.recommendations.map((rec) => (
                          <li
                            key={rec}
                            className="text-xs text-muted-foreground"
                          >
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {analyzeMutation.error && (
                <p className="text-xs text-destructive">
                  {analyzeMutation.error.message}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify**

Run: `bun lint` then `bunx tsc --noEmit`
Expected: pass. (A "Props must be serializable" warning on `onOpenChange` matches the pre-existing pattern in this feature — acceptable.) If Biome flags the `useEffect` reset dependencies differently, keep the reset-on-`[appId, cvId]` behavior and adjust the ignore comment to whatever Biome expects.

- [ ] **Step 3: Commit**

```bash
git add features/job-tracker/components/ai-assistant-modal.tsx
git commit -m "feat: AI assistant modal for job tracker"
```

---

### Task 4: Violet FAB + wire modal into JobTrackerPage

**Files:**
- Modify: `features/job-tracker/components/job-tracker-page.tsx`

**Interfaces:**
- Consumes: `AiAssistantModal({ open, onOpenChange, applications })` from Task 3.

- [ ] **Step 1: Lazy-import the modal**

Next to the existing lazy imports at the top of `job-tracker-page.tsx`:

```tsx
const AiAssistantModal = lazy(() =>
  import("@/features/job-tracker/components/ai-assistant-modal").then((m) => ({
    default: m.AiAssistantModal,
  })),
);
```

- [ ] **Step 2: Add state and render FAB + modal**

In `JobTrackerPage`, next to the other useState calls:

```tsx
  const [aiOpen, setAiOpen] = useState(false);
```

Inside the returned root `<div>`, after the last `<Suspense>` block:

```tsx
      <Button
        size="icon"
        aria-label="Asisten AI"
        onClick={() => setAiOpen(true)}
        className="fixed right-6 bottom-6 z-40 size-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg transition-transform hover:scale-105 hover:from-violet-600 hover:to-fuchsia-700"
      >
        <SparklesIcon className="size-5" />
      </Button>
      <Suspense fallback={null}>
        <AiAssistantModal
          open={aiOpen}
          onOpenChange={setAiOpen}
          applications={data.applications}
        />
      </Suspense>
```

Add `import { SparklesIcon } from "lucide-react";` to the imports.

Note: this JSX is inside the success branch (after the `error`/`!data` early returns), so the FAB never renders on `UpsellView` — as the spec requires.

- [ ] **Step 3: Verify**

Run: `bun lint` then `bunx tsc --noEmit`
Expected: pass.

- [ ] **Step 4: Manual smoke test**

Run `bun dev`, open the job tracker page as a paid user:
- Violet round FAB appears bottom-right; click opens the wide modal.
- Pickers default to first application and its linked CV (or first CV).
- JD chip reflects the selected application's `jobDescription`; fallback textarea appears when absent.
- Analisis tab button disabled without JD.
- Switching application/CV clears previous results.

- [ ] **Step 5: Commit**

```bash
git add features/job-tracker/components/job-tracker-page.tsx
git commit -m "feat: violet AI assistant FAB on job tracker page"
```

---

### Task 5: Builder cleanup

**Files:**
- Modify: `features/ai/components/ai-panel.tsx`
- Delete: `features/ai/components/ai-cover-letter-modal.tsx`
- Delete: `features/ai/components/ai-interview-modal.tsx`

**Interfaces:**
- Consumes: nothing new. `AiScoreCard`, `AiJdAnalyzer`, `AiChat` remain untouched.

- [ ] **Step 1: Trim AiPanel**

Replace the full contents of `features/ai/components/ai-panel.tsx` with:

```tsx
"use client";

import { AiChat } from "./ai-chat";
import { AiJdAnalyzer } from "./ai-jd-analyzer";
import { AiScoreCard } from "./ai-score-card";

export function AiPanel() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <AiScoreCard />
      <div className="border-t" />
      <AiJdAnalyzer />
      <div className="border-t" />
      <AiChat />
    </div>
  );
}
```

- [ ] **Step 2: Delete the modal files**

```bash
git rm features/ai/components/ai-cover-letter-modal.tsx features/ai/components/ai-interview-modal.tsx
```

- [ ] **Step 3: Check for dangling imports**

Grep the repo (excluding node_modules) for `AiCoverLetterModal` and `AiInterviewModal`.
Expected: no matches remain.

- [ ] **Step 4: Verify**

Run: `bun lint` then `bunx tsc --noEmit`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add features/ai/components/ai-panel.tsx
git commit -m "refactor: remove cover letter & interview modals from builder AI panel"
```
