# Onboarding AI: Form Lengkap Multi-langkah + AI Tulis Teks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti form AI onboarding 3-field dengan form multi-langkah 5 langkah yang mengumpulkan semua 8 bagian CV; AI hanya menulis teks prosa (headline/summary/deskripsi) dari fakta user, tanpa mengarang.

**Architecture:** Server: tambah mutation `trpc.ai.enrich` (OpenRouter JSON mode, prompt `enricher.ts`) yang menerima fakta lengkap dan hanya mengembalikan field teks. Client: komponen `StepAiForm` (state lokal `useState`, repeater per section) menggantikan `StepAiGenerator`; wizard mem-build `CvContent` dari form, panggil enrich, merge hasil HANYA ke field teks kosong, lalu `cv.create`.

**Tech Stack:** Next.js 16, React 19, tRPC v11, Zod, bun (test), Biome (`bun lint`).

## Global Constraints

- UI copy dalam Bahasa Indonesia (ikuti pola `editor-dialog.tsx`).
- JANGAN hapus `ai.generate` dan `features/ai/server/prompts/generator.ts` — keduanya dipakai `AiGeneratorModal` (builder F5). `enrich` adalah mutation BARU.
- Reuse schema/types dari `@/features/cv/schemas/cv` (`personalSchema`, `experienceSchema`, `educationSchema`, `skillSchema`, `interpersonalSchema`, `languageSchema`, `certificationSchema`, `organizationSchema`, `projectSchema`, empty* defaults, `CvContent`).
- Reuse komponen ui: `@/components/ui/field` (`Field`, `FieldLabel`), `input`, `textarea`, `checkbox`, `slider`, `label`, `button`, dan `lucide-react` ikon.
- Enrich mengisi HANYA field teks yang KOSONG. Teks yang sudah ditulis user dipertahankan.
- Enrich memakai `checkRateLimit(ctx.session.user.id, "ai:generate", 5)` (reuse key) dan `consumeAiQuota(ctx)`.
- Enrich: `model = DEFAULT_MODEL_MINI`, `stream = false`, `response_format: { type: "json_object" }`, `max_tokens = 1000`.
- Test: `bun test <file>`. Lint: `bun lint`. Jalankan `bun lint` sebelum tiap commit.

---

### Task 1: Enrich server — prompt + mutation

**Files:**
- Create: `features/ai/server/prompts/enricher.ts`
- Modify: `features/ai/server/ai-router.ts` (tambah import + mutation `enrich`, jangan ubah `generate`)

**Interfaces:**
- Produces: `enricherSystemPrompt` (string, ekspor dari `prompts/enricher.ts`).
- Produces: mutation `enrich` — input `{ personal?, summary?, experience[], education[], skills[], interpersonal[], languages[], certifications[], organizations[], projects[] }` → output `{ headline?, summary?, experience?: string[], projects?: string[], organizations?: string[], certifications?: string[] }` (semua deskripsi string array sejajar urutan input).

- [ ] **Step 1: Tulis prompt**

`features/ai/server/prompts/enricher.ts`:

```ts
export const enricherSystemPrompt = `Kamu adalah penulis CV profesional. Tugasmu menulis teks prosa untuk CV berdasarkan fakta yang diberikan pengguna (JSON).

ATURAN WAJIB:
1. Tulis prosa HANYA dari fakta yang ada di input. JANGAN menambah fakta baru.
2. Dilarang mengarang: nama orang, perusahaan, sekolah, tanggal, email, telepon, angka statistik, atau nama skill.
3. Jika informasi pengguna sedikit, tulis deskripsi singkat yang hati-hati dan umum — jangan mengisi kekosongan dengan fakta fiktif.
4. Untuk setiap item experience/projects/organizations/certifications, tulis deskripsi 2-3 kalimat dengan kata kerja aktif.
5. Jika bagian input kosong, kirim string kosong untuk bagian itu.
6. Balas HANYA JSON (tanpa teks lain) dengan bentuk berikut:
{
  "headline": "",
  "summary": "",
  "experience": [""],
  "projects": [""],
  "organizations": [""],
  "certifications": [""]
}
Setiap elemen array mengikuti urutan item pada input.`;
```

- [ ] **Step 2: Tambah mutation `enrich`**

Di `features/ai/server/ai-router.ts`:

a) Tambah import `enricherSystemPrompt`:

```ts
import { enricherSystemPrompt } from "@/features/ai/server/prompts/enricher";
```

b) Ganti import `cvContentSchema` dari schema file menjadi semua schema section:

```ts
import {
  certificationSchema,
  cvContentSchema,
  educationSchema,
  experienceSchema,
  interpersonalSchema,
  languageSchema,
  organizationSchema,
  personalSchema,
  projectSchema,
  skillSchema,
} from "@/features/cv/schemas/cv";
```

c) Tambah schema hasil enrich (sebelum `export const aiRouter`):

```ts
const enrichResultSchema = z.object({
  headline: z.string().max(160).optional(),
  summary: z.string().max(3000).optional(),
  experience: z.array(z.string().max(2000)).max(20).optional(),
  projects: z.array(z.string().max(2000)).max(20).optional(),
  organizations: z.array(z.string().max(2000)).max(20).optional(),
  certifications: z.array(z.string().max(2000)).max(20).optional(),
});
```

d) Tambah mutation setelah `generate` (block berakhir baris 272):

```ts
  enrich: protectedProcedure
    .input(
      z.object({
        personal: personalSchema.optional(),
        summary: z.string().max(3000).optional().default(""),
        experience: z.array(experienceSchema).max(20).optional().default([]),
        education: z.array(educationSchema).max(20).optional().default([]),
        skills: z.array(skillSchema).max(40).optional().default([]),
        interpersonal: z
          .array(interpersonalSchema)
          .max(40)
          .optional()
          .default([]),
        languages: z.array(languageSchema).max(40).optional().default([]),
        certifications: z
          .array(certificationSchema)
          .max(20)
          .optional()
          .default([]),
        organizations: z
          .array(organizationSchema)
          .max(20)
          .optional()
          .default([]),
        projects: z.array(projectSchema).max(20).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:generate", 5);
      await consumeAiQuota(ctx);

      const response = await openrouter.chat.completions.create({
        model: DEFAULT_MODEL_MINI,
        stream: false,
        messages: [
          { role: "system", content: enricherSystemPrompt },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const validated = enrichResultSchema.safeParse(JSON.parse(raw));
        if (!validated.success) throw new Error("Schema mismatch");
        return validated.data;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat ringkasan. Coba lagi.",
        });
      }
    }),
```

- [ ] **Step 3: Verifikasi**

Run: `bunx tsc --noEmit`
Expected: tidak ada error type.

- [ ] **Step 4: Commit**

```bash
git add features/ai/server/prompts/enricher.ts features/ai/server/ai-router.ts
git commit -m "feat(ai): add enrich mutation that writes prose from facts only"
```

---

### Task 2: Helper murni — buildCvContent + mergeEnriched (TDD)

**Files:**
- Create: `features/onboarding/lib/cv-from-form.ts`
- Create: `features/onboarding/lib/cv-from-form.test.ts`

**Interfaces:**
- Produces: `AiFormState` (interface), `emptyAiFormState` (default), `buildCvContent(state: AiFormState, templateId: string): CvContent`, `EnrichResult` (interface), `mergeEnriched(content: CvContent, enriched: EnrichResult): CvContent`.
- Consumes: empty* dan types dari `@/features/cv/schemas/cv`.

- [ ] **Step 1: Tulis failing test**

`features/onboarding/lib/cv-from-form.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  buildCvContent,
  emptyAiFormState,
  mergeEnriched,
} from "./cv-from-form";

describe("buildCvContent", () => {
  it("builds full CvContent with title from fullName", () => {
    const state = {
      ...emptyAiFormState,
      personal: {
        ...emptyAiFormState.personal,
        fullName: "Budi Santoso",
      },
      experience: [
        {
          company: "PT Maju",
          role: "Backend Engineer",
          location: "",
          startDate: "2020",
          endDate: "2023",
          current: false,
          description: "",
        },
      ],
    };
    const content = buildCvContent(state, "classic");
    expect(content.title).toBe("CV Budi Santoso");
    expect(content.templateId).toBe("classic");
    expect(content.experience).toHaveLength(1);
    expect(content.skills).toHaveLength(0);
  });
});

describe("mergeEnriched", () => {
  it("fills only empty text fields, keeps user-written text", () => {
    const state = {
      ...emptyAiFormState,
      personal: { ...emptyAiFormState.personal, fullName: "Budi" },
      experience: [
        {
          company: "A",
          role: "R",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          description: "",
        },
        {
          company: "B",
          role: "S",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          description: "Ditulis user",
        },
      ],
    };
    const content = buildCvContent(state, "classic");
    const merged = mergeEnriched(content, {
      summary: "Ringkasan AI",
      headline: "Headline AI",
      experience: ["Desc 1", "Desc 2 yang tak terpakai"],
    });
    expect(merged.summary).toBe("Ringkasan AI");
    expect(merged.personal.headline).toBe("Headline AI");
    expect(merged.experience[0].description).toBe("Desc 1");
    expect(merged.experience[1].description).toBe("Ditulis user");
  });

  it("never overwrites user-filled headline", () => {
    const state = {
      ...emptyAiFormState,
      personal: {
        ...emptyAiFormState.personal,
        fullName: "Budi",
        headline: "User headline",
      },
    };
    const content = buildCvContent(state, "classic");
    const merged = mergeEnriched(content, { headline: "AI headline" });
    expect(merged.personal.headline).toBe("User headline");
  });

  it("does not mutate the input content", () => {
    const state = {
      ...emptyAiFormState,
      personal: { ...emptyAiFormState.personal, fullName: "Budi" },
    };
    const content = buildCvContent(state, "classic");
    const merged = mergeEnriched(content, { summary: "S" });
    expect(merged).not.toBe(content);
    expect(merged.personal).not.toBe(content.personal);
    expect(content.summary).toBe("");
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan FAIL**

Run: `bun test features/onboarding/lib/cv-from-form.test.ts`
Expected: FAIL (module `./cv-from-form` tidak ditemukan).

- [ ] **Step 3: Implementasi**

`features/onboarding/lib/cv-from-form.ts`:

```ts
import {
  emptyColors,
  emptyPersonal,
  emptyTypography,
  type CvContent,
  type PersonalInput,
} from "@/features/cv/schemas/cv";
import type {
  CertificationInput,
  EducationInput,
  ExperienceInput,
  InterpersonalInput,
  LanguageInput,
  OrganizationInput,
  ProjectInput,
  SkillInput,
} from "@/features/cv/schemas/cv";

export interface AiFormState {
  personal: PersonalInput;
  experience: ExperienceInput[];
  education: EducationInput[];
  skills: SkillInput[];
  interpersonal: InterpersonalInput[];
  languages: LanguageInput[];
  certifications: CertificationInput[];
  organizations: OrganizationInput[];
  projects: ProjectInput[];
}

export const emptyAiFormState: AiFormState = {
  personal: { ...emptyPersonal },
  experience: [],
  education: [],
  skills: [],
  interpersonal: [],
  languages: [],
  certifications: [],
  organizations: [],
  projects: [],
};

export function buildCvContent(
  state: AiFormState,
  templateId: string,
): CvContent {
  return {
    title: `CV ${state.personal.fullName}`,
    templateId,
    typography: { ...emptyTypography },
    colors: { ...emptyColors },
    personal: { ...state.personal },
    summary: "",
    experience: state.experience.map((e) => ({ ...e })),
    education: state.education.map((e) => ({ ...e })),
    skills: state.skills.map((s) => ({ ...s })),
    interpersonal: state.interpersonal.map((i) => ({ ...i })),
    languages: state.languages.map((l) => ({ ...l })),
    certifications: state.certifications.map((c) => ({ ...c })),
    organizations: state.organizations.map((o) => ({ ...o })),
    projects: state.projects.map((p) => ({ ...p })),
    custom: [],
  };
}

export interface EnrichResult {
  headline?: string;
  summary?: string;
  experience?: string[];
  projects?: string[];
  organizations?: string[];
  certifications?: string[];
}

export function mergeEnriched(
  content: CvContent,
  enriched: EnrichResult,
): CvContent {
  const next: CvContent = {
    ...content,
    personal: { ...content.personal },
    experience: content.experience.map((e) => ({ ...e })),
    education: content.education.map((e) => ({ ...e })),
    skills: content.skills.map((s) => ({ ...s })),
    interpersonal: content.interpersonal.map((i) => ({ ...i })),
    languages: content.languages.map((l) => ({ ...l })),
    certifications: content.certifications.map((c) => ({ ...c })),
    organizations: content.organizations.map((o) => ({ ...o })),
    projects: content.projects.map((p) => ({ ...p })),
    custom: content.custom.map((c) => ({ ...c })),
  };

  if (enriched.headline && !next.personal.headline) {
    next.personal.headline = enriched.headline;
  }
  if (enriched.summary && !next.summary) {
    next.summary = enriched.summary;
  }
  const fill = (
    items: { description: string }[],
    descriptions: string[] | undefined,
  ) => {
    descriptions?.forEach((desc, i) => {
      if (items[i] && !items[i].description) {
        items[i].description = desc;
      }
    });
  };
  fill(next.experience, enriched.experience);
  fill(next.projects, enriched.projects);
  fill(next.organizations, enriched.organizations);
  fill(next.certifications, enriched.certifications);

  return next;
}
```

- [ ] **Step 4: Jalankan test — pastikan PASS**

Run: `bun test features/onboarding/lib/cv-from-form.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add features/onboarding/lib/cv-from-form.ts features/onboarding/lib/cv-from-form.test.ts
git commit -m "feat(onboarding): cv-from-form helpers with merge-enriched-only-empty"
```

---

### Task 3: Komponen form multi-langkah `StepAiForm`

**Files:**
- Create: `features/onboarding/components/step-ai-form.tsx`

**Interfaces:**
- Consumes: `AiFormState`, `emptyAiFormState` dari `@/features/onboarding/lib/cv-from-form`; empty* dari `@/features/cv/schemas/cv`.
- Produces: `StepAiForm` — props `{ onGenerate: (state: AiFormState) => void; pending: boolean; error: string | null }`.

- [ ] **Step 1: Tulis komponen**

`features/onboarding/components/step-ai-form.tsx`:

```tsx
"use client";

import {
  CircleMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyInterpersonal,
  emptyLanguage,
  emptyOrganization,
  emptyProject,
  emptySkill,
} from "@/features/cv/schemas/cv";
import {
  type AiFormState,
  emptyAiFormState,
} from "@/features/onboarding/lib/cv-from-form";

const LEVEL_LABELS = ["Pemula", "Dasar", "Menengah", "Lanjutan", "Mahir"] as const;

const STEP_IDS = [1, 2, 3, 4, 5] as const;
const STEP_TITLES: Record<(typeof STEP_IDS)[number], string> = {
  1: "Data pribadi",
  2: "Pengalaman kerja",
  3: "Pendidikan",
  4: "Keahlian",
  5: "Proyek & lainnya",
};

type ListKey = Exclude<keyof AiFormState, "personal">;
type ListItem<K extends ListKey> = AiFormState[K][number];

/** Generic repeater: list of item forms with add/remove. */
function ListEditor<K extends ListKey>({
  items,
  label,
  renderItem,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: AiFormState[K][];
  label: string;
  renderItem: (
    item: ListItem<K>,
    update: (patch: Partial<ListItem<K>>) => void,
  ) => React.ReactNode;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<ListItem<K>>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div
          key={i}
          className={i > 0 ? "rounded-xl border border-border p-4" : undefined}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {renderItem(item, (patch) => onUpdate(i, patch))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-1 shrink-0"
              onClick={() => onRemove(i)}
              aria-label={`Hapus ${label}`}
            >
              <CircleMinusIcon className="text-muted-foreground" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={onAdd}
      >
        <PlusIcon data-icon="inline-start" />
        Tambah {label}
      </Button>
    </div>
  );
}

export function StepAiForm({
  onGenerate,
  pending,
  error,
}: {
  onGenerate: (state: AiFormState) => void;
  pending: boolean;
  error: string | null;
}) {
  const [step, setStep] = useState<(typeof STEP_IDS)[number]>(1);
  const [form, setForm] = useState<AiFormState>(emptyAiFormState);

  function updateList<K extends ListKey>(
    key: K,
    index: number,
    patch: Partial<ListItem<K>>,
  ) {
    setForm((prev) => {
      const list = [...prev[key]] as Array<Record<string, unknown>>;
      list[index] = {
        ...list[index],
        ...(patch as Record<string, unknown>),
      };
      return { ...prev, [key]: list } as AiFormState;
    });
  }

  function addItem<K extends ListKey>(key: K, empty: ListItem<K>) {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], empty] }));
  }

  function removeAt<K extends ListKey>(key: K, index: number) {
    setForm((prev) => {
      const list = [...prev[key]];
      list.splice(index, 1);
      return { ...prev, [key]: list };
    });
  }

  const canSubmit =
    form.personal.fullName.trim().length > 0 && !pending;

  const nextStep = STEP_IDS.find((s) => s === step + 1);
  const prevStep = STEP_IDS.find((s) => s === step - 1);
  const isLast = step === 5;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {/* Step indicator */}
      <div className="mx-auto flex items-center gap-2">
        {STEP_IDS.map((s) => (
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
      <h2 className="text-center text-lg font-semibold">
        {STEP_TITLES[step]}
      </h2>

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>
              Nama lengkap <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              value={form.personal.fullName}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    fullName: e.target.value,
                  },
                }))
              }
              placeholder="Budi Santoso"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Judul / posisi saat ini</FieldLabel>
            <Input
              value={form.personal.headline}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    headline: e.target.value,
                  },
                }))
              }
              placeholder="Backend Engineer"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={form.personal.email}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    email: e.target.value,
                  },
                }))
              }
              placeholder="budi@email.com"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Telepon</FieldLabel>
            <Input
              value={form.personal.phone}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    phone: e.target.value,
                  },
                }))
              }
              placeholder="0812-3456-7890"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Lokasi</FieldLabel>
            <Input
              value={form.personal.location}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    location: e.target.value,
                  },
                }))
              }
              placeholder="Jakarta, Indonesia"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>Website</FieldLabel>
            <Input
              value={form.personal.website}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    website: e.target.value,
                  },
                }))
              }
              placeholder="budi.dev"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>LinkedIn</FieldLabel>
            <Input
              value={form.personal.linkedin}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    linkedin: e.target.value,
                  },
                }))
              }
              placeholder="linkedin.com/in/budi"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel>GitHub</FieldLabel>
            <Input
              value={form.personal.github}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    github: e.target.value,
                  },
                }))
              }
              placeholder="github.com/budi"
              disabled={pending}
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <ListEditor
          items={form.experience}
          label="pengalaman"
          onAdd={() => addItem("experience", emptyExperience)}
          onUpdate={(i, p) => updateList("experience", i, p)}
          onRemove={(i) => removeAt("experience", i)}
          renderItem={(item, update) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Posisi</FieldLabel>
                <Input
                  value={item.role}
                  onChange={(e) => update({ role: e.target.value })}
                  placeholder="Frontend Engineer"
                />
              </Field>
              <Field>
                <FieldLabel>Perusahaan</FieldLabel>
                <Input
                  value={item.company}
                  onChange={(e) => update({ company: e.target.value })}
                  placeholder="Acme Inc."
                />
              </Field>
              <Field>
                <FieldLabel>Mulai</FieldLabel>
                <Input
                  value={item.startDate ?? ""}
                  onChange={(e) => update({ startDate: e.target.value })}
                  placeholder="Jan 2022"
                />
              </Field>
              <Field>
                <FieldLabel>Selesai</FieldLabel>
                <Input
                  value={item.current ? "Sekarang" : (item.endDate ?? "")}
                  onChange={(e) =>
                    update({ endDate: e.target.value, current: false })
                  }
                  placeholder="Sekarang"
                  disabled={item.current}
                />
              </Field>
              <Label className="col-span-2 -mt-2 text-muted-foreground">
                <Checkbox
                  checked={!!item.current}
                  onCheckedChange={(checked) =>
                    update({
                      current: !!checked,
                      endDate: checked ? "" : (item.endDate ?? ""),
                    })
                  }
                />
                Saya masih bekerja di posisi ini
              </Label>
              <Field className="col-span-2">
                <FieldLabel>Alamat</FieldLabel>
                <Input
                  value={item.location ?? ""}
                  onChange={(e) => update({ location: e.target.value })}
                  placeholder="Jakarta, Indonesia"
                />
              </Field>
              <Field className="col-span-2">
                <FieldLabel>
                  Deskripsi (opsional — kosongkan biar AI yang menulis)
                </FieldLabel>
                <Textarea
                  rows={3}
                  value={item.description ?? ""}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Tanggung jawab dan pencapaian Anda."
                />
              </Field>
            </div>
          )}
        />
      )}

      {step === 3 && (
        <ListEditor
          items={form.education}
          label="pendidikan"
          onAdd={() => addItem("education", emptyEducation)}
          onUpdate={(i, p) => updateList("education", i, p)}
          onRemove={(i) => removeAt("education", i)}
          renderItem={(item, update) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Institusi</FieldLabel>
                <Input
                  value={item.school}
                  onChange={(e) => update({ school: e.target.value })}
                  placeholder="Universitas Indonesia"
                />
              </Field>
              <Field>
                <FieldLabel>Gelar</FieldLabel>
                <Input
                  value={item.degree ?? ""}
                  onChange={(e) => update({ degree: e.target.value })}
                  placeholder="Sarjana"
                />
              </Field>
              <Field>
                <FieldLabel>Bidang Studi</FieldLabel>
                <Input
                  value={item.field ?? ""}
                  onChange={(e) => update({ field: e.target.value })}
                  placeholder="Sistem Informasi"
                />
              </Field>
              <Field>
                <FieldLabel>IPK</FieldLabel>
                <Input
                  value={item.gpa ?? ""}
                  onChange={(e) => update({ gpa: e.target.value })}
                  placeholder="3.80 / 4.00"
                />
              </Field>
              <Field>
                <FieldLabel>Mulai</FieldLabel>
                <Input
                  value={item.startDate ?? ""}
                  onChange={(e) => update({ startDate: e.target.value })}
                  placeholder="2020"
                />
              </Field>
              <Field>
                <FieldLabel>Selesai</FieldLabel>
                <Input
                  value={item.endDate ?? ""}
                  onChange={(e) => update({ endDate: e.target.value })}
                  placeholder="2024"
                />
              </Field>
            </div>
          )}
        />
      )}

      {step === 4 && (
        <div className="space-y-6">
          <ListEditor
            items={form.skills}
            label="keahlian"
            onAdd={() => addItem("skills", emptySkill)}
            onUpdate={(i, p) => updateList("skills", i, p)}
            onRemove={(i) => removeAt("skills", i)}
            renderItem={(item, update) => {
              const level = item.level ?? 3;
              return (
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Keahlian</FieldLabel>
                    <Input
                      value={item.name}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="TypeScript"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>
                      Tingkat{" "}
                      <span className="font-normal text-muted-foreground">
                        ({level} = {LEVEL_LABELS[level - 1]})
                      </span>
                    </FieldLabel>
                    <div className="pt-2">
                      <Slider
                        min={1}
                        max={5}
                        value={[level]}
                        onValueChange={(v) =>
                          update({ level: Array.isArray(v) ? v[0] : v })
                        }
                      />
                    </div>
                  </Field>
                </div>
              );
            }}
          />
          <ListEditor
            items={form.interpersonal}
            label="keahlian interpersonal"
            onAdd={() => addItem("interpersonal", emptyInterpersonal)}
            onUpdate={(i, p) => updateList("interpersonal", i, p)}
            onRemove={(i) => removeAt("interpersonal", i)}
            renderItem={(item, update) => (
              <Field>
                <FieldLabel>Keahlian Interpersonal</FieldLabel>
                <Input
                  value={item.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Komunikasi"
                />
              </Field>
            )}
          />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <ListEditor
            items={form.projects}
            label="proyek"
            onAdd={() => addItem("projects", emptyProject)}
            onUpdate={(i, p) => updateList("projects", i, p)}
            onRemove={(i) => removeAt("projects", i)}
            renderItem={(item, update) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Nama</FieldLabel>
                  <Input
                    value={item.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Website Portofolio"
                  />
                </Field>
                <Field>
                  <FieldLabel>Jenis</FieldLabel>
                  <Input
                    value={item.type ?? ""}
                    onChange={(e) => update({ type: e.target.value })}
                    placeholder="Aplikasi Web"
                  />
                </Field>
                <Field>
                  <FieldLabel>Tanggal</FieldLabel>
                  <Input
                    value={item.date ?? ""}
                    onChange={(e) => update({ date: e.target.value })}
                    placeholder="2024"
                  />
                </Field>
                <Field>
                  <FieldLabel>Keahlian</FieldLabel>
                  <Input
                    value={item.skill ?? ""}
                    onChange={(e) => update({ skill: e.target.value })}
                    placeholder="React, Node.js"
                  />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel>Deskripsi (opsional)</FieldLabel>
                  <Textarea
                    rows={3}
                    value={item.description ?? ""}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
          <ListEditor
            items={form.certifications}
            label="sertifikasi"
            onAdd={() => addItem("certifications", emptyCertification)}
            onUpdate={(i, p) => updateList("certifications", i, p)}
            onRemove={(i) => removeAt("certifications", i)}
            renderItem={(item, update) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Nama</FieldLabel>
                  <Input
                    value={item.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="AWS Certified Developer"
                  />
                </Field>
                <Field>
                  <FieldLabel>Diterima Dari</FieldLabel>
                  <Input
                    value={item.issuer ?? ""}
                    onChange={(e) => update({ issuer: e.target.value })}
                    placeholder="Amazon Web Services"
                  />
                </Field>
                <Field>
                  <FieldLabel>Tanggal</FieldLabel>
                  <Input
                    value={item.date ?? ""}
                    onChange={(e) => update({ date: e.target.value })}
                    placeholder="Mei 2024"
                  />
                </Field>
                <Field>
                  <FieldLabel>Deskripsi (opsional)</FieldLabel>
                  <Input
                    value={item.description ?? ""}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Rincian singkat sertifikasi."
                  />
                </Field>
              </div>
            )}
          />
          <ListEditor
            items={form.languages}
            label="bahasa"
            onAdd={() => addItem("languages", emptyLanguage)}
            onUpdate={(i, p) => updateList("languages", i, p)}
            onRemove={(i) => removeAt("languages", i)}
            renderItem={(item, update) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Bahasa</FieldLabel>
                  <Input
                    value={item.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Bahasa Inggris"
                  />
                </Field>
                <Field>
                  <FieldLabel>Tingkat</FieldLabel>
                  <Input
                    value={item.level ?? ""}
                    onChange={(e) => update({ level: e.target.value })}
                    placeholder="Fasih"
                  />
                </Field>
              </div>
            )}
          />
          <ListEditor
            items={form.organizations}
            label="organisasi"
            onAdd={() => addItem("organizations", emptyOrganization)}
            onUpdate={(i, p) => updateList("organizations", i, p)}
            onRemove={(i) => removeAt("organizations", i)}
            renderItem={(item, update) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Nama</FieldLabel>
                  <Input
                    value={item.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Himpunan Mahasiswa"
                  />
                </Field>
                <Field>
                  <FieldLabel>Tanggal</FieldLabel>
                  <Input
                    value={item.date ?? ""}
                    onChange={(e) => update({ date: e.target.value })}
                    placeholder="2022"
                  />
                </Field>
                <Field>
                  <FieldLabel>Posisi</FieldLabel>
                  <Input
                    value={item.role ?? ""}
                    onChange={(e) => update({ role: e.target.value })}
                    placeholder="Ketua Divisi"
                  />
                </Field>
                <Field>
                  <FieldLabel>Deskripsi (opsional)</FieldLabel>
                  <Input
                    value={item.description ?? ""}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </Field>
              </div>
            )}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => prevStep && setStep(prevStep)}
          disabled={!prevStep || pending}
        >
          <ChevronLeftIcon data-icon="inline-start" />
          Kembali
        </Button>
        {isLast ? (
          <Button
            onClick={() => onGenerate(form)}
            loading={pending}
            loadingText="Membuat CV…"
            disabled={!canSubmit}
          >
            Buat dengan AI
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => nextStep && setStep(nextStep)}
            disabled={!nextStep || pending}
          >
            Lanjut
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        )}
      </div>
      {isLast && (
        <p className="text-center text-xs text-muted-foreground">
          AI hanya melengkapi teks (ringkasan & deskripsi) dari data di atas dan
          tidak mengarang informasi pribadi.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi type + lint**

Run: `bunx tsc --noEmit; bun lint`
Expected: tanpa error.

- [ ] **Step 3: Commit**

```bash
git add features/onboarding/components/step-ai-form.tsx
git commit -m "feat(onboarding): multi-step AI onboarding form for all CV sections"
```

---

### Task 4: Integrasi wizard + hapus komponen lama

**Files:**
- Modify: `features/onboarding/components/onboarding-wizard.tsx`
- Delete: `features/onboarding/components/step-ai-generator.tsx`

**Interfaces:**
- Consumes: `StepAiForm` dari `step-ai-form`; `AiFormState`, `buildCvContent`, `mergeEnriched`, `EnrichResult` dari `@/features/onboarding/lib/cv-from-form`.

- [ ] **Step 1: Ganti import**

Di `features/onboarding/components/onboarding-wizard.tsx`:

a) Ganti:
```tsx
import { StepAiGenerator } from "@/features/onboarding/components/step-ai-generator";
```
menjadi:
```tsx
import { StepAiForm } from "@/features/onboarding/components/step-ai-form";
import {
  type AiFormState,
  buildCvContent,
  type EnrichResult,
  mergeEnriched,
} from "@/features/onboarding/lib/cv-from-form";
```

b) Tambah mutation enrich di bawah `generateMutation` (hanya HAPUS baris `generateMutation` — itu dipakai wizard sekarang):

Hapus:
```tsx
  const generateMutation = trpc.ai.generate.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
```
Ganti dengan:
```tsx
  const enrichMutation = trpc.ai.enrich.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
```

c) Ganti `handleAiGenerate`:

```ts
  async function handleAiGenerate(state: AiFormState) {
    setAiError(null);
    setAiPending(true);
    try {
      const content = buildCvContent(state, templateId ?? "classic");
      let enriched: EnrichResult = {};
      try {
        enriched = await enrichMutation.mutateAsync({
          personal: state.personal,
          summary: "",
          experience: state.experience,
          education: state.education,
          skills: state.skills,
          interpersonal: state.interpersonal,
          languages: state.languages,
          certifications: state.certifications,
          organizations: state.organizations,
          projects: state.projects,
        });
      } catch {
        // AI optional: kalau gagal, tetap buat CV dari data user.
      }
      await createMutation.mutateAsync(mergeEnriched(content, enriched));
    } catch (err) {
      setAiPending(false);
      setAiError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }
```

d) Ganti render step 3 AI:

```tsx
        {step === 3 && method === "ai" && (
          <StepAiGenerator
            onGenerate={handleAiGenerate}
            pending={aiPending}
            error={aiError}
          />
        )}
```
menjadi:
```tsx
        {step === 3 && method === "ai" && (
          <StepAiForm
            onGenerate={handleAiGenerate}
            pending={aiPending}
            error={aiError}
          />
        )}
```

e) Perbarui subtitle AI di `getStepTitle`:

```ts
  if (method === "ai") {
    return {
      title: "Ceritakan tentang kamu",
      subtitle: "Isi data CV — AI membantu menulis ringkasan dan deskripsi.",
    };
  }
```

- [ ] **Step 2: Hapus komponen lama**

Hapus `features/onboarding/components/step-ai-generator.tsx`.

- [ ] **Step 3: Verifikasi**

Run: `bunx tsc --noEmit; bun lint`
Expected: tanpa error (tidak ada lagi referensi ke `StepAiGenerator` / `step-ai-generator`).

- [ ] **Step 4: Commit**

```bash
git add features/onboarding/components/onboarding-wizard.tsx features/onboarding/components/step-ai-generator.tsx
git commit -m "feat(onboarding): wire multi-step AI form to enrich + cv.create"
```

---

## Self-Review

**1. Spec coverage:**
- Form 5 langkah semua 8 bagian → Task 3 (`StepAiForm`).
- AI tulis teks saja, anti-halu → Task 1 (`enricher` prompt + `enrich`).
- Enrich hanya isi field kosong → Task 2 `mergeEnriched` + test.
- Ketahanan (AI gagal tetap buat CV) → Task 4 try/catch di `handleAiGenerate`.
- Validasi Zod → Task 1 `enrichResultSchema` + schema section dari `cv.ts`.
- `ai.generate` & `generator.ts` dipertahankan → Task 1 tidak menyentuh `generate`; Task 4 hanya hapus komponen wizard lama.

**2. Placeholder scan:** semua step berisi kode konkret; tidak ada "TBD"/"implement later".

**3. Type consistency:**
- `AiFormState`, `buildCvContent`, `mergeEnriched`, `EnrichResult` didefinisikan Task 2, dipakai Task 3 & 4 dengan nama sama.
- Props `StepAiForm` (`onGenerate`, `pending`, `error`) konsisten antara Task 3 dan Task 4.
- `updateList`/`addItem`/`removeAt` (Task 3) konsisten dipakai semua `ListEditor`.
- Output `enrich` (`headline`, `summary`, `experience[]`, dll) sesuai bentuk `EnrichResult` Task 2.
- Input `enrich` (Task 1) menerima semua field `AiFormState` yang dikirim wizard (Task 4) — cocok.
