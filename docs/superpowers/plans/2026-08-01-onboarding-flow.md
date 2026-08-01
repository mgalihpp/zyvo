# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New users with zero CVs get a full-page onboarding wizard at `/onboarding`: choose manual vs import → pick template → land in the builder (empty for manual, AI-parsed content for import).

**Architecture:** New `features/onboarding/` feature with a client wizard (local `useState`, no store). Import pipeline is browser-side text extraction (pdfjs-dist for PDF, mammoth for DOCX, or pasted text) → new tRPC `ai.importCv` (OpenRouter JSON mode, mirrors `ai.generate`) → existing `cv.create` (extended to persist all sections). Dashboard server page redirects to `/onboarding` when the user has zero CVs and no skip cookie.

**Tech Stack:** Next.js 16 App Router, tRPC v11, Zod v4, OpenRouter via `openai` SDK, `pdfjs-dist` + `mammoth` (new deps, dynamic imports), bun:test.

**Spec:** `docs/superpowers/specs/2026-08-01-onboarding-flow-design.md`

## Global Constraints

- All UI copy in **Indonesian** (matches existing app copy).
- Async buttons MUST use the `Button` component's `loading` / `loadingText` props (never manual spinner/disabled juggling).
- Import consumes 1 monthly AI quota via `consumeAiQuota`; no refund on parse failure (consistent with `ai.generate`).
- Import text capped at **15,000 characters** (truncated client-side, enforced server-side via Zod).
- Import file cap: **5 MB**, PDF and DOCX only (client-side rejection).
- Skip cookie name: `zyvo_onboarding_skipped` (value `1`, path `/`, max-age 1 year).
- `pdfjs-dist` and `mammoth` are loaded via **dynamic `import()`** only — never top-level imports (bundle size).
- Package manager is **bun** (`bun add`, `bun test`). Lint with `bun lint`.
- `@/*` path alias maps to project root.
- Run `bun lint` before each commit; fix what it reports.

---

### Task 1: `ai.importCv` backend — parse helper, prompt, tests, procedure

**Files:**
- Create: `features/ai/server/prompts/importer.ts`
- Create: `features/ai/server/import-cv.ts`
- Test: `features/ai/server/import-cv.test.ts`
- Modify: `features/ai/server/ai-router.ts` (add `importCv` procedure after `generate`, lines ~226-270)

**Interfaces:**
- Consumes: `cvContentSchema` from `@/features/cv/schemas/cv`, `openrouter`, `checkRateLimit`, `consumeAiQuota` (all existing).
- Produces: tRPC mutation `ai.importCv` — input `{ text: string }` (1..15000 chars), returns `Partial<CvContent>` (validated `cvContentSchema.partial()` data, always includes `title`). Also exports pure helper `parseImportedCv(raw: string): Partial<CvContent>` (throws `Error("Schema mismatch")` / JSON errors on bad input).

- [ ] **Step 1: Write the failing test**

Create `features/ai/server/import-cv.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { parseImportedCv } from "./import-cv";

describe("parseImportedCv", () => {
  it("parses a valid AI response and keeps all sections", () => {
    const raw = JSON.stringify({
      personal: { fullName: "Budi Santoso", email: "budi@mail.com" },
      summary: "Backend engineer 5 tahun.",
      experience: [
        {
          company: "PT Maju",
          role: "Backend Engineer",
          startDate: "2020",
          endDate: "2023",
          description: "Membangun API pembayaran.",
        },
      ],
      education: [{ school: "UI", degree: "S1", field: "Ilmu Komputer" }],
      skills: [{ name: "Go", level: 4 }],
      languages: [{ name: "Inggris", level: "Fluent" }],
      certifications: [{ name: "AWS SAA", issuer: "Amazon" }],
      organizations: [{ name: "HMIF", role: "Ketua" }],
      projects: [{ name: "Zyvo", description: "CV builder" }],
      interpersonal: [{ name: "Komunikasi" }],
      custom: [{ title: "Penghargaan", description: "Juara 1 hackathon" }],
    });
    const result = parseImportedCv(raw);
    expect(result.personal?.fullName).toBe("Budi Santoso");
    expect(result.experience).toHaveLength(1);
    expect(result.languages).toHaveLength(1);
    expect(result.certifications).toHaveLength(1);
    expect(result.organizations).toHaveLength(1);
    expect(result.interpersonal).toHaveLength(1);
    expect(result.custom).toHaveLength(1);
  });

  it("derives title from fullName", () => {
    const raw = JSON.stringify({ personal: { fullName: "Budi Santoso" } });
    expect(parseImportedCv(raw).title).toBe("CV Budi Santoso");
  });

  it("falls back to default title when no name detected", () => {
    const raw = JSON.stringify({ summary: "Seorang engineer." });
    expect(parseImportedCv(raw).title).toBe("CV Hasil Import");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseImportedCv("not json")).toThrow();
  });

  it("throws on schema mismatch", () => {
    // experience items missing required company/role
    const raw = JSON.stringify({ experience: [{ location: "Jakarta" }] });
    expect(() => parseImportedCv(raw)).toThrow();
  });

  it("drops unknown fields instead of failing", () => {
    const raw = JSON.stringify({
      summary: "ok",
      hallucinatedSection: [{ foo: "bar" }],
    });
    const result = parseImportedCv(raw);
    expect(result.summary).toBe("ok");
    expect("hallucinatedSection" in result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/ai/server/import-cv.test.ts`
Expected: FAIL — `Cannot find module './import-cv'`

- [ ] **Step 3: Write the parse helper**

Create `features/ai/server/import-cv.ts`:

```typescript
import { type CvContent, cvContentSchema } from "@/features/cv/schemas/cv";

/**
 * Validate the raw JSON string returned by the import model against the CV
 * schema. Pure so it can be unit-tested without the OpenRouter client.
 * Throws on invalid JSON or schema mismatch — the router maps that to a
 * user-facing TRPCError.
 */
export function parseImportedCv(raw: string): Partial<CvContent> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  // Zod strips unknown keys by default, so hallucinated sections are dropped.
  const result = cvContentSchema.partial().safeParse(parsed);
  if (!result.success) {
    throw new Error("Schema mismatch");
  }
  const fullName =
    typeof result.data.personal?.fullName === "string"
      ? result.data.personal.fullName.trim()
      : "";
  return {
    ...result.data,
    title: fullName ? `CV ${fullName}` : "CV Hasil Import",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/ai/server/import-cv.test.ts`
Expected: PASS (6 tests)

Note: if the "throws on schema mismatch" test fails because Zod tolerates the input, adjust the fixture to something the schema genuinely rejects (e.g. `{ "skills": [{ "level": 99 }] }` — missing required `name` and out-of-range level) rather than weakening the helper.

- [ ] **Step 5: Write the importer prompt**

Create `features/ai/server/prompts/importer.ts`:

```typescript
export const importerSystemPrompt = `Kamu adalah parser CV profesional.
Pengguna memberikan teks mentah hasil ekstraksi dari file CV (PDF/DOCX) atau teks yang di-paste. Ekstrak SEMUA informasi yang ada menjadi JSON terstruktur.

Balas HANYA dengan JSON yang sesuai struktur ini:
{
  "personal": { "fullName": "", "headline": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "", "photo": "" },
  "summary": "",
  "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
  "education": [{ "school": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": "" }],
  "skills": [{ "name": "", "level": 3 }],
  "interpersonal": [{ "name": "" }],
  "languages": [{ "name": "", "level": "" }],
  "certifications": [{ "name": "", "issuer": "", "date": "", "url": "", "description": "" }],
  "organizations": [{ "name": "", "role": "", "date": "", "description": "" }],
  "projects": [{ "name": "", "type": "", "date": "", "skill": "", "description": "" }],
  "custom": [{ "title": "", "description": "" }]
}

Aturan:
- JANGAN mengarang informasi yang tidak ada di teks. Kosongkan field yang tidak ditemukan; array kosong jika section tidak ada.
- Pertahankan bahasa asli teks CV (jangan menerjemahkan).
- Tanggal tulis apa adanya dari teks (mis. "Jan 2020", "2019 - 2022").
- skill.level default 3 jika tidak ada indikasi tingkat keahlian.
- Section yang tidak cocok dengan kategori manapun (penghargaan, publikasi, dll) masukkan ke "custom" dengan title = nama section.
- experience/education urutkan sesuai urutan di teks.`;
```

- [ ] **Step 6: Add the `importCv` procedure to the AI router**

In `features/ai/server/ai-router.ts`:

Add imports at the top (alongside the existing prompt imports):

```typescript
import { parseImportedCv } from "@/features/ai/server/import-cv";
import { importerSystemPrompt } from "@/features/ai/server/prompts/importer";
```

Add this procedure after the `generate` procedure (i.e. after line ~270, before `interviewPrep`):

```typescript
  importCv: protectedProcedure
    .input(z.object({ text: z.string().min(50).max(15000) }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:importCv", 5);
      await consumeAiQuota(ctx);

      const response = await openrouter.chat.completions.create({
        model: DEFAULT_MODEL,
        stream: false,
        messages: [
          { role: "system", content: importerSystemPrompt },
          { role: "user", content: input.text },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        return parseImportedCv(raw);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membaca isi CV. Coba lagi.",
        });
      }
    }),
```

Note the `min(50)`: fewer than 50 characters cannot be a real CV, and rejecting early saves the user a wasted quota unit.

- [ ] **Step 7: Verify lint and full test suite**

Run: `bun lint && bun test features/ai/server/import-cv.test.ts`
Expected: lint clean, tests PASS

- [ ] **Step 8: Commit**

```bash
git add features/ai/server/import-cv.ts features/ai/server/import-cv.test.ts features/ai/server/prompts/importer.ts features/ai/server/ai-router.ts
git commit -m "feat(ai): add importCv procedure to parse raw CV text into structured content"
```

---

### Task 2: Extend `cv.create` to persist all sections

**Files:**
- Modify: `features/cv/server/cv-router.ts:350-373` (the `create` procedure)

**Interfaces:**
- Consumes: existing `cvContentSchema.partial().optional()` input (already accepts every section — only persistence is missing).
- Produces: `cv.create` now persists `interpersonal`, `languages`, `certifications`, `organizations`, `custom` in addition to the current fields. Return shape unchanged: `{ id: string }`.

- [ ] **Step 1: Extend the `create` data payload**

In `features/cv/server/cv-router.ts`, the `create` mutation currently writes:

```typescript
      const cv = await ctx.prisma.cV.create({
        data: {
          userId: ctx.session.user.id,
          title: input?.title ?? "CV Tanpa Judul",
          templateId: input?.templateId ?? "classic",
          personal: input?.personal,
          summary: input?.summary,
          experience: input?.experience ?? [],
          education: input?.education ?? [],
          skills: input?.skills ?? [],
          projects: input?.projects ?? [],
        },
        select: { id: true },
      });
```

Replace the `data` block with:

```typescript
      const cv = await ctx.prisma.cV.create({
        data: {
          userId: ctx.session.user.id,
          title: input?.title ?? "CV Tanpa Judul",
          templateId: input?.templateId ?? "classic",
          personal: input?.personal,
          summary: input?.summary,
          experience: input?.experience ?? [],
          education: input?.education ?? [],
          skills: input?.skills ?? [],
          interpersonal: input?.interpersonal ?? [],
          languages: input?.languages ?? [],
          certifications: input?.certifications ?? [],
          organizations: input?.organizations ?? [],
          projects: input?.projects ?? [],
          custom: input?.custom ?? [],
        },
        select: { id: true },
      });
```

Check `prisma/schema.prisma` first: confirm the `cV` model has fields named `interpersonal`, `languages`, `certifications`, `organizations`, `custom` (they exist — the builder autosaves them via `cv.update` — but verify exact field names and match them).

- [ ] **Step 2: Verify with lint + typecheck**

Run: `bun lint && bunx tsc --noEmit`
Expected: clean (pre-existing errors in `entitlements.test.ts` about `./entitlements` module resolution are known noise — ignore only those)

- [ ] **Step 3: Commit**

```bash
git add features/cv/server/cv-router.ts
git commit -m "feat(cv): persist all CV sections on create so AI import keeps every section"
```

---

### Task 3: Browser text extraction lib (`extract-text.ts`) + new deps

**Files:**
- Create: `features/onboarding/lib/extract-text.ts`
- Modify: `package.json` (via `bun add pdfjs-dist mammoth`)

**Interfaces:**
- Consumes: `pdfjs-dist`, `mammoth` (dynamic imports).
- Produces: `extractTextFromFile(file: File): Promise<string>` — resolves with extracted plain text (trimmed, capped at 15,000 chars); throws `ExtractError` with Indonesian user-facing `message` for: unsupported type, file > 5 MB, empty/undetectable text. Also exports `MAX_IMPORT_CHARS = 15000` and `class ExtractError extends Error`.

- [ ] **Step 1: Install dependencies**

Run: `bun add pdfjs-dist mammoth`
Expected: both added to `package.json` dependencies.

- [ ] **Step 2: Write the extraction lib**

Create `features/onboarding/lib/extract-text.ts`:

```typescript
/**
 * Browser-side text extraction for CV import. pdfjs-dist and mammoth are
 * heavy, so both are loaded via dynamic import only when actually used.
 */

export const MAX_IMPORT_CHARS = 15000;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/** User-facing extraction failure — `message` is safe to show directly. */
export class ExtractError extends Error {}

const PDF_TYPE = "application/pdf";
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
    );
  }
  return pages.join("\n\n");
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractError("Ukuran file maksimal 5MB.");
  }

  const isPdf = file.type === PDF_TYPE || file.name.endsWith(".pdf");
  const isDocx = file.type === DOCX_TYPE || file.name.endsWith(".docx");
  if (!isPdf && !isDocx) {
    throw new ExtractError("Format tidak didukung. Gunakan file PDF atau DOCX.");
  }

  const buffer = await file.arrayBuffer();
  const text = isPdf ? await extractPdf(buffer) : await extractDocx(buffer);
  const cleaned = text.replace(/[ \t]+/g, " ").trim();

  if (cleaned.length < 50) {
    throw new ExtractError(
      "Tidak bisa membaca teks dari file ini. Coba paste teks CV kamu langsung.",
    );
  }

  return cleaned.slice(0, MAX_IMPORT_CHARS);
}
```

Note: the 50-char floor matches the server-side `min(50)` on `ai.importCv` — a scanned/image PDF yields near-zero text and must be caught client-side before quota is spent.

- [ ] **Step 3: Verify it compiles and lints**

Run: `bun lint && bunx tsc --noEmit`
Expected: clean. If `pdfjs-dist` types complain about `content.items` mapping, keep the `"str" in item` guard (TextItem vs TextMarkedContent union) — do not cast to `any`.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock features/onboarding/lib/extract-text.ts
git commit -m "feat(onboarding): add browser-side PDF/DOCX text extraction"
```

---

### Task 4: Onboarding wizard UI + `/onboarding` page

**Files:**
- Create: `features/onboarding/components/onboarding-wizard.tsx`
- Create: `features/onboarding/components/step-choose-method.tsx`
- Create: `features/onboarding/components/step-choose-template.tsx`
- Create: `features/onboarding/components/step-import-cv.tsx`
- Create: `app/(dashboard)/onboarding/page.tsx`

**Interfaces:**
- Consumes: `extractTextFromFile`, `ExtractError`, `MAX_IMPORT_CHARS` from `@/features/onboarding/lib/extract-text` (Task 3); `trpc.ai.importCv` (Task 1); `trpc.cv.create` (Task 2); existing `AiGeneratorModal`, `CvThumbnail`, `TEMPLATES`, `SAMPLE_CV`, `templateDefaultColors`, `templateDefaultTypography`, `Button`, `Textarea`, `toast`.
- Produces: route `/onboarding` (auth-guarded, redirects to `/dashboard` if the user already has a CV); exported constant `ONBOARDING_SKIP_COOKIE = "zyvo_onboarding_skipped"` from `onboarding-wizard.tsx` (Task 5's dashboard redirect imports it).

- [ ] **Step 1: Step 1 component — choose method**

Create `features/onboarding/components/step-choose-method.tsx`:

```tsx
"use client";

import { FileUp, PenLine, SparklesIcon } from "lucide-react";

export type OnboardingMethod = "manual" | "import";

export function StepChooseMethod({
  onSelect,
  onOpenAiGenerator,
}: {
  onSelect: (method: OnboardingMethod) => void;
  onOpenAiGenerator: () => void;
}) {
  const options = [
    {
      method: "manual" as const,
      icon: PenLine,
      title: "Buat Manual",
      description:
        "Mulai dari CV kosong dan isi setiap bagian sendiri di builder.",
    },
    {
      method: "import" as const,
      icon: FileUp,
      title: "Import CV",
      description:
        "Upload CV lama (PDF/DOCX) atau paste teksnya — AI akan mengisi semuanya otomatis.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.method}
            type="button"
            onClick={() => onSelect(opt.method)}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <opt.icon className="size-5" />
            </span>
            <span className="text-lg font-semibold">{opt.title}</span>
            <span className="text-sm text-muted-foreground">
              {opt.description}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenAiGenerator}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        <SparklesIcon className="size-4" />
        Atau buat dengan AI
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Step 2 component — choose template**

Create `features/onboarding/components/step-choose-template.tsx`:

```tsx
"use client";

import { Crown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type TemplateCategory,
} from "@/features/cv/components/templates";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cn } from "@/lib/utils";

type Filter = TemplateCategory | "all";

export function StepChooseTemplate({
  onSelect,
}: {
  onSelect: (templateId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.categories.includes(filter));

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Semua" },
    ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.label })),
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap justify-center gap-2"
        role="radiogroup"
        aria-label="Filter kategori template"
      >
        {chips.map((chip) => {
          const active = chip.id === filter;
          return (
            // biome-ignore lint/a11y/useSemanticElements: pill toggle, not a native radio input
            <button
              key={chip.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(chip.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((template) => {
          const cv = {
            ...SAMPLE_CV,
            templateId: template.id,
            colors: templateDefaultColors(template.id),
            typography: templateDefaultTypography(template.id),
          };
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className="group flex flex-col text-left focus-visible:outline-none"
            >
              <div className="relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-primary/40">
                <CvThumbnail cv={cv} className="w-full" aspectRatio="1 / 1.414" />
                {template.premium ? (
                  <Badge className="absolute left-2 top-2 border-amber-200/60 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.55)]">
                    <Crown
                      aria-hidden="true"
                      className="fill-white text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                    />
                    Premium
                  </Badge>
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/60 group-hover:opacity-100">
                  <span className="text-base font-bold text-white">
                    Pilih template
                  </span>
                </div>
              </div>
              <p className="mt-2 line-clamp-1 px-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                {template.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Step 3 component — import CV**

Create `features/onboarding/components/step-import-cv.tsx`:

```tsx
"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ExtractError,
  extractTextFromFile,
  MAX_IMPORT_CHARS,
} from "@/features/onboarding/lib/extract-text";
import { cn } from "@/lib/utils";

type ImportPhase = "idle" | "reading" | "analyzing" | "creating";

const PHASE_LABEL: Record<Exclude<ImportPhase, "idle">, string> = {
  reading: "Membaca file…",
  analyzing: "Menganalisis CV dengan AI…",
  creating: "Menyiapkan builder…",
};

export function StepImportCv({
  onImport,
  phase,
  error,
  onClearError,
}: {
  /** Called with extracted/pasted text; parent runs AI + create. */
  onImport: (text: string) => void;
  phase: ImportPhase;
  error: string | null;
  onClearError: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [pasted, setPasted] = useState("");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase !== "idle";

  async function handleFile(file: File) {
    setExtractError(null);
    onClearError();
    try {
      const text = await extractTextFromFile(file);
      onImport(text);
    } catch (err) {
      if (err instanceof ExtractError) {
        setExtractError(err.message);
        // Scanned PDFs land here — nudge toward the paste tab.
        if (err.message.includes("paste")) setTab("paste");
      } else {
        setExtractError("Gagal membaca file. Coba lagi atau paste teks CV kamu.");
      }
    }
  }

  const shownError = extractError ?? error;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {/* Tab switcher */}
      <div className="flex justify-center gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { id: "upload", label: "Upload file" },
            { id: "paste", label: "Paste teks" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={busy}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {busy ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-10 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium">{PHASE_LABEL[phase]}</p>
        </div>
      ) : tab === "upload" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileUp className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">
              Klik untuk pilih file atau drag & drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF atau DOCX, maks. 5MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </button>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value.slice(0, MAX_IMPORT_CHARS))}
            placeholder="Paste seluruh isi CV kamu di sini…"
            className="min-h-[220px] text-xs"
          />
          <Button
            className="w-full"
            disabled={pasted.trim().length < 50}
            onClick={() => {
              setExtractError(null);
              onClearError();
              onImport(pasted.trim());
            }}
          >
            Import dari teks
          </Button>
        </div>
      )}

      {shownError && !busy && (
        <p className="text-center text-sm text-destructive">{shownError}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wizard orchestrator**

Create `features/onboarding/components/onboarding-wizard.tsx`:

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AiGeneratorModal } from "@/features/ai/components/ai-generator-modal";
import {
  type OnboardingMethod,
  StepChooseMethod,
} from "@/features/onboarding/components/step-choose-method";
import { StepChooseTemplate } from "@/features/onboarding/components/step-choose-template";
import { StepImportCv } from "@/features/onboarding/components/step-import-cv";
import { trpc } from "@/lib/trpc/client";

export const ONBOARDING_SKIP_COOKIE = "zyvo_onboarding_skipped";

type Step = 1 | 2 | 3;
type ImportPhase = "idle" | "reading" | "analyzing" | "creating";

const STEP_TITLES: Record<Step, { title: string; subtitle: string }> = {
  1: {
    title: "Bagaimana kamu ingin membuat CV?",
    subtitle: "Pilih cara yang paling cocok untukmu.",
  },
  2: {
    title: "Pilih template",
    subtitle: "Semua template bisa diganti kapan saja di builder.",
  },
  3: {
    title: "Import CV kamu",
    subtitle: "AI akan mengisi semua bagian CV secara otomatis.",
  },
};

export function OnboardingWizard() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<OnboardingMethod | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = trpc.ai.importCv.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
  });

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    if (method === "import") {
      setStep(3);
      return;
    }
    // Manual: create empty CV immediately and go to builder.
    createMutation.mutate(
      { templateId: id },
      {
        onError: (err) => {
          toast.add({ title: err.message, type: "error" });
          setTemplateId(null);
        },
      },
    );
  }

  async function handleImport(text: string) {
    setImportError(null);
    try {
      setImportPhase("analyzing");
      const content = await importMutation.mutateAsync({ text });
      setImportPhase("creating");
      await createMutation.mutateAsync({
        ...content,
        templateId: templateId ?? "classic",
      });
      // Navigation happens in createMutation.onSuccess; keep the spinner up.
    } catch (err) {
      setImportPhase("idle");
      setImportError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }

  function handleSkip() {
    document.cookie = `${ONBOARDING_SKIP_COOKIE}=1; path=/; max-age=31536000`;
    router.push("/dashboard");
  }

  const { title, subtitle } = STEP_TITLES[step];
  const busy = createMutation.isPending || importPhase !== "idle";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-8">
      {/* Top bar: back + skip */}
      <div className="flex items-center justify-between">
        {step > 1 && !busy ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImportError(null);
              setStep((s) => (s === 3 ? 2 : 1) as Step);
            }}
          >
            <ArrowLeft data-icon="inline-start" />
            Kembali
          </Button>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy}>
          Lewati
        </Button>
      </div>

      {/* Step indicator */}
      <div className="mx-auto mt-6 flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <span
            key={s}
            className={
              s <= step
                ? "h-1.5 w-8 rounded-full bg-primary"
                : "h-1.5 w-8 rounded-full bg-muted"
            }
          />
        ))}
      </div>

      {/* Heading */}
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Step body */}
      <div className="mt-8 flex-1">
        {step === 1 && (
          <StepChooseMethod
            onSelect={(m) => {
              setMethod(m);
              setStep(2);
            }}
            onOpenAiGenerator={() => setGeneratorOpen(true)}
          />
        )}
        {step === 2 && <StepChooseTemplate onSelect={handleSelectTemplate} />}
        {step === 3 && (
          <StepImportCv
            onImport={handleImport}
            phase={importPhase}
            error={importError}
            onClearError={() => setImportError(null)}
          />
        )}
      </div>

      {/* Manual-path pending overlay text */}
      {step === 2 && createMutation.isPending && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Menyiapkan builder…
        </p>
      )}

      <AiGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
      />
    </div>
  );
}
```

Design notes for the implementer:
- `handleImport` sets phase `"analyzing"` immediately (extraction already happened inside `StepImportCv` before `onImport` fires — the `"reading"` phase is set inside the child before calling; actually extraction is fast and synchronous-ish, so `"reading"` is only cosmetic. If you want the `"reading"` label to show, lift `handleFile` extraction into the wizard instead — acceptable either way, but keep phase transitions in ONE place; simplest correct version: keep extraction in the child as written, phases `analyzing`/`creating` only, and delete `"reading"` from the type if unused. Biome will flag the unused key — resolve by keeping the type as written and NOT deleting, since `PHASE_LABEL` in the child references all three; the child may receive `"reading"` never — that is fine and not a lint error.)
- Quota/CV-limit errors from the server arrive as `err.message` (Indonesian upsell copy from entitlements) and render under the dropzone. Add a billing link line when the error mentions upgrade: not required — the server copy already explains.

- [ ] **Step 5: The `/onboarding` page (server component)**

Create `app/(dashboard)/onboarding/page.tsx`:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { constructMetadata } from "@/lib/seo";
import { getServerTrpc } from "@/server/trpc/server";

export const metadata: Metadata = constructMetadata({ title: "Mulai" });

/** Onboarding for users with zero CVs. Users with CVs are sent back. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const trpc = await getServerTrpc();
  const cvs = await trpc.cv.list();
  if (cvs.length > 0) redirect("/dashboard");

  return <OnboardingWizard />;
}
```

Note: `/onboarding` sits directly under `app/(dashboard)/` — the sidebar layout lives at `app/(dashboard)/dashboard/layout.tsx`, so this page intentionally renders without the sidebar. Verify `app/(dashboard)/layout.tsx` does not exist (it doesn't at plan time) — if one has appeared since, check what it wraps.

- [ ] **Step 6: Verify build + lint**

Run: `bun lint && bunx tsc --noEmit`
Expected: clean.

Then run `bun dev`, sign in with an account that has CVs, and confirm `/onboarding` redirects to `/dashboard`.

- [ ] **Step 7: Commit**

```bash
git add features/onboarding/components app/\(dashboard\)/onboarding
git commit -m "feat(onboarding): add onboarding wizard page with method, template, and import steps"
```

---

### Task 5: Dashboard redirect for zero-CV users

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx` (add redirect logic after the `cv.list` fetch, ~line 21)

**Interfaces:**
- Consumes: `ONBOARDING_SKIP_COOKIE` — do NOT import it from `onboarding-wizard.tsx` (that file is `"use client"`; importing it into a server component pulls the whole client module graph). Instead move the constant to a shared location in this task.
- Produces: `/dashboard` redirects to `/onboarding` when the user has zero CVs and no skip cookie.

- [ ] **Step 1: Move the cookie constant to a shared lib**

Create `features/onboarding/lib/constants.ts`:

```typescript
export const ONBOARDING_SKIP_COOKIE = "zyvo_onboarding_skipped";
```

In `features/onboarding/components/onboarding-wizard.tsx`, delete the local `export const ONBOARDING_SKIP_COOKIE = ...` line and import it instead:

```typescript
import { ONBOARDING_SKIP_COOKIE } from "@/features/onboarding/lib/constants";
```

- [ ] **Step 2: Add the redirect to the dashboard page**

In `app/(dashboard)/dashboard/page.tsx`, add to the imports:

```typescript
import { cookies } from "next/headers";
import { ONBOARDING_SKIP_COOKIE } from "@/features/onboarding/lib/constants";
```

After `const initialCvs = await trpc.cv.list();` (line 21), insert:

```typescript
  if (initialCvs.length === 0) {
    const cookieStore = await cookies();
    if (!cookieStore.get(ONBOARDING_SKIP_COOKIE)) {
      redirect("/onboarding");
    }
  }
```

- [ ] **Step 3: Verify the loop is closed**

Run `bun dev` and check with a zero-CV account:
1. `/dashboard` → redirects to `/onboarding`. ✓
2. Click "Lewati" → lands on `/dashboard`, stays there (cookie set, no loop). ✓
3. Clear the cookie in devtools → `/dashboard` redirects again. ✓

- [ ] **Step 4: Lint + commit**

```bash
bun lint
git add app/\(dashboard\)/dashboard/page.tsx features/onboarding/lib/constants.ts features/onboarding/components/onboarding-wizard.tsx
git commit -m "feat(onboarding): redirect zero-CV users from dashboard to onboarding"
```

---

### Task 6: End-to-end smoke test

**Files:** none created — manual verification pass.

**Interfaces:** n/a.

- [ ] **Step 1: Run the full automated suite**

Run: `bun test features/ai/server/import-cv.test.ts && bun lint && bunx tsc --noEmit && bun build`
Expected: all pass (ignore only the pre-existing `entitlements.test.ts` module-resolution diagnostic if it appears in tsc output).

- [ ] **Step 2: Manual smoke checklist (`bun dev`, zero-CV test account)**

Verify each; note failures instead of checking them off:

1. `/dashboard` with 0 CVs → auto-redirect to `/onboarding`.
2. **Manual path:** Buat Manual → pilih template `modern` → lands in `/builder/[id]` with empty CV using `modern` template.
3. Delete that CV. **Import PDF path:** Import CV → pilih template → upload a real text-based PDF CV → progress labels cycle → lands in builder with sections filled (personal, experience, education at minimum). Check `languages`/`certifications` populate if the PDF has them.
4. Delete. **Import DOCX path:** same with a `.docx` file.
5. Delete. **Paste path:** paste tab → paste CV text → import works.
6. **Scanned PDF:** upload an image-only PDF → error message appears and tab switches to paste; no AI quota consumed (check `ai.quotaStatus` unchanged).
7. **Oversized file:** file > 5MB → rejected client-side with "Ukuran file maksimal 5MB."
8. **Skip:** Lewati → `/dashboard` shows old empty state, refresh does not bounce back.
9. **Existing-CV guard:** with ≥1 CV, open `/onboarding` directly → redirected to `/dashboard`.
10. **Premium template as free user:** pick a premium template (e.g. `executive`) on manual path → server FORBIDDEN error surfaces as toast, wizard stays usable.
11. **AI generator link:** "Atau buat dengan AI" opens the existing modal and the flow completes.
12. **Free-plan quota exhausted (if feasible):** import shows the server's Indonesian upsell message under the dropzone.

- [ ] **Step 3: Fix anything found, then final commit if changes were made**

```bash
git add -A
git commit -m "fix(onboarding): smoke test fixes"
```

(Skip the commit if no changes.)
