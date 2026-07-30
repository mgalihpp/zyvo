# CV Photo Profile + 4 Template Baru Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan foto profile ke CV (via UploadThing), tampilkan di PersonalForm, dan buat 4 template baru (executive, creative, elegant, compact) yang masing-masing menampilkan foto dengan gaya berbeda.

**Architecture:** Field `photo` ditambahkan ke `personalSchema` (Zod) dan Prisma `Personal` composite type — propagasi otomatis ke seluruh stack. UploadThing menangani upload ke CDN; URL tersimpan via `setPersonal({ photo: url })` → autosave 800ms. Empat template baru mengikuti pola yang sama (`TemplateProps`, CSS variables, A4 canvas).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Zod, Prisma (MongoDB), Zustand, Better Auth, UploadThing (`uploadthing` + `@uploadthing/react`), Bun

## Global Constraints

- Gunakan `bun` untuk semua perintah (bukan npm/yarn)
- Tailwind v4: gunakan kelas utility biasa dan CSS variables — tidak ada `@apply` atau `@tailwind`
- Template menggunakan `<img>` biasa (bukan `next/image`) agar Puppeteer PDF kompatibel
- Semua template ikuti `TemplateProps` interface dari `features/cv/components/templates/shared.tsx`
- Target A4: `max-w-[794px] min-h-[1123px]`, print: `print:min-h-[297mm]`
- CSS variables template: `--cv-color-bg`, `--cv-color-heading`, `--cv-color-text`, `--cv-color-link`, `--cv-color-accent`, `--cv-color-on-accent`, `--cv-font-heading`, `--cv-font-body`
- `bun lint` dan `bun build` harus lulus setelah setiap task
- `UPLOADTHING_TOKEN` perlu diisi di `.env` (dari dashboard UploadThing) sebelum upload bisa diuji
- Field `photo` opsional — CV lama tanpa foto harus tetap render dengan baik di semua template

---

## File Map

| File | Status | Task |
|---|---|---|
| `features/cv/schemas/cv.ts` | Modify | Task 1 |
| `prisma/schema.prisma` | Modify | Task 1 |
| `app/api/uploadthing/core.ts` | Create | Task 2 |
| `app/api/uploadthing/route.ts` | Create | Task 2 |
| `features/cv/lib/uploadthing.ts` | Create | Task 2 |
| `next.config.ts` | Modify | Task 2 |
| `features/cv/components/panels/photo-field.tsx` | Create | Task 3 |
| `features/cv/components/panels/personal-form.tsx` | Modify | Task 3 |
| `features/cv/components/templates/registry.ts` | Modify | Task 4 |
| `features/cv/components/templates/template-colors.ts` | Modify | Task 4 |
| `features/cv/components/templates/executive.tsx` | Create | Task 4 |
| `features/cv/components/templates/creative.tsx` | Create | Task 5 |
| `features/cv/components/templates/elegant.tsx` | Create | Task 6 |
| `features/cv/components/templates/compact.tsx` | Create | Task 7 |
| `features/cv/components/templates/index.ts` | Modify | Task 8 |
| `features/cv/components/templates/eager.ts` | Modify | Task 8 |

---

### Task 1: Data Layer — field `photo` di schema & Prisma

**Files:**
- Modify: `features/cv/schemas/cv.ts`
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `PersonalInput.photo?: string` — digunakan oleh semua template (Task 4–7) dan PhotoField (Task 3)

- [ ] **Step 1: Tambah field `photo` ke `personalSchema` di `features/cv/schemas/cv.ts`**

  Cari blok `export const personalSchema = z.object({` dan tambahkan `photo` sebagai field terakhir sebelum `});`:

  ```ts
  export const personalSchema = z.object({
    fullName: z.string().max(120).optional().default(""),
    headline: z.string().max(160).optional().default(""),
    email: z
      .union([z.literal(""), z.email()])
      .optional()
      .default(""),
    phone: z.string().max(40).optional().default(""),
    location: z.string().max(120).optional().default(""),
    website: z.string().max(200).optional().default(""),
    linkedin: z.string().max(200).optional().default(""),
    github: z.string().max(200).optional().default(""),
    photo: z.string().max(500).optional().default(""),
  });
  ```

- [ ] **Step 2: Update `emptyPersonal` di baris bawah file yang sama**

  Cari `export const emptyPersonal: PersonalInput = {` dan tambahkan `photo: ""`:

  ```ts
  export const emptyPersonal: PersonalInput = {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: "",
    photo: "",
  };
  ```

- [ ] **Step 3: Tambah `photo String?` ke Prisma composite type `Personal` di `prisma/schema.prisma`**

  Cari blok `type Personal {` dan tambahkan field `photo`:

  ```prisma
  type Personal {
    fullName String?
    headline String?
    email    String?
    phone    String?
    location String?
    website  String?
    linkedin String?
    github   String?
    photo    String?
  }
  ```

- [ ] **Step 4: Push schema ke MongoDB dan regenerasi Prisma Client**

  ```bash
  bun db:push
  bun db:generate
  ```

  Expected: kedua perintah selesai tanpa error.

- [ ] **Step 5: Verifikasi TypeScript compile**

  ```bash
  bun build 2>&1 | Select-String -Pattern "error" | Select-Object -First 10
  ```

  Expected: tidak ada type error baru.

- [ ] **Step 6: Commit**

  ```bash
  git add features/cv/schemas/cv.ts prisma/schema.prisma
  git commit -m "feat: add photo field to personalSchema and Prisma Personal type"
  ```

---

### Task 2: UploadThing Integration

**Files:**
- Create: `app/api/uploadthing/core.ts`
- Create: `app/api/uploadthing/route.ts`
- Create: `features/cv/lib/uploadthing.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `UploadButton` component (dari `features/cv/lib/uploadthing.ts`) — digunakan oleh PhotoField (Task 3)
- Produces: `OurFileRouter` type — digunakan untuk type-safety

- [ ] **Step 1: Install packages**

  ```bash
  bun add uploadthing @uploadthing/react
  ```

  Expected: `package.json` terbaru dengan kedua package.

- [ ] **Step 2: Buat file router UploadThing di `app/api/uploadthing/core.ts`**

  ```ts
  import { auth } from "@/features/auth/lib/auth";
  import { createUploadthing, type FileRouter } from "uploadthing/next";
  import { headers } from "next/headers";

  const f = createUploadthing();

  export const ourFileRouter = {
    cvPhoto: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
      .middleware(async () => {
        const session = await auth.api.getSession({
          headers: await headers(),
        });
        if (!session?.user) throw new Error("Unauthorized");
        return { userId: session.user.id };
      })
      .onUploadComplete(async ({ metadata, file }) => {
        return { uploadedBy: metadata.userId, url: file.ufsUrl };
      }),
  } satisfies FileRouter;

  export type OurFileRouter = typeof ourFileRouter;
  ```

- [ ] **Step 3: Buat route handler di `app/api/uploadthing/route.ts`**

  ```ts
  import { createRouteHandler } from "uploadthing/next";
  import { ourFileRouter } from "./core";

  export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
    config: {
      token: process.env.UPLOADTHING_TOKEN,
    },
  });
  ```

- [ ] **Step 4: Buat helper type-safe di `features/cv/lib/uploadthing.ts`**

  ```ts
  import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
  import type { OurFileRouter } from "@/app/api/uploadthing/core";

  export const UploadButton = generateUploadButton<OurFileRouter>();
  export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
  ```

- [ ] **Step 5: Tambah UploadThing CDN ke `next.config.ts`**

  Ganti isi `next.config.ts` dengan:

  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    reactCompiler: true,
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "utfs.io",
        },
        {
          protocol: "https",
          hostname: "*.ufs.sh",
        },
      ],
    },
  };

  export default nextConfig;
  ```

- [ ] **Step 6: Tambah placeholder `UPLOADTHING_TOKEN` ke `.env` jika belum ada**

  Periksa dulu: `Select-String -Path .env -Pattern "UPLOADTHING"` — jika tidak ada output, tambahkan baris berikut ke `.env`:

  ```
  UPLOADTHING_TOKEN=
  ```

  (Isi nilai sesungguhnya dari dashboard https://uploadthing.com)

- [ ] **Step 7: Verifikasi build**

  ```bash
  bun build 2>&1 | Select-String -Pattern "error" | Select-Object -First 10
  ```

  Expected: tidak ada error TypeScript/build. (Upload belum bisa dicoba sampai `UPLOADTHING_TOKEN` diisi.)

- [ ] **Step 8: Commit**

  ```bash
  git add app/api/uploadthing/ features/cv/lib/uploadthing.ts next.config.ts .env
  git commit -m "feat: integrate UploadThing for CV photo upload"
  ```

---

### Task 3: UI — PhotoField dan integrasi ke PersonalForm

**Files:**
- Create: `features/cv/components/panels/photo-field.tsx`
- Modify: `features/cv/components/panels/personal-form.tsx`

**Interfaces:**
- Consumes: `UploadButton` dari `features/cv/lib/uploadthing.ts`
- Consumes: `useCvStore` dari `features/cv/stores/cv-store-provider` — `setPersonal(patch: Partial<PersonalInput>)`
- Produces: `<PhotoField />` — dipasang di `personal-form.tsx`

- [ ] **Step 1: Buat `features/cv/components/panels/photo-field.tsx`**

  ```tsx
  "use client";

  import { UploadButton } from "@/features/cv/lib/uploadthing";
  import { useCvStore } from "@/features/cv/stores/cv-store-provider";

  /** Upload/preview foto profile di panel Informasi Pribadi. */
  export function PhotoField() {
    const photo = useCvStore((s) => s.personal.photo);
    const setPersonal = useCvStore((s) => s.setPersonal);

    return (
      <div className="flex items-center gap-4">
        {/* Avatar preview */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-zinc-300 bg-zinc-100">
          {photo ? (
            <img
              src={photo}
              alt="Foto profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-zinc-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </span>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex flex-col gap-2">
          <UploadButton
            endpoint="cvPhoto"
            onClientUploadComplete={(res) => {
              if (res[0]) {
                setPersonal({ photo: res[0].ufsUrl });
              }
            }}
            onUploadError={(error) => {
              console.error("Upload error:", error);
            }}
            appearance={{
              button:
                "bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors",
              allowedContent: "text-zinc-400 text-xs",
            }}
          />
          {photo ? (
            <button
              type="button"
              onClick={() => setPersonal({ photo: "" })}
              className="text-xs text-red-500 hover:text-red-700 text-left"
            >
              Hapus foto
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Sisipkan `<PhotoField />` di atas grid di `personal-form.tsx`**

  Tambahkan import dan sisipkan komponen. Konten `personal-form.tsx` yang baru:

  ```tsx
  "use client";

  import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
  import { Input } from "@/components/ui/input";
  import { PhotoField } from "@/features/cv/components/panels/photo-field";
  import { useCvStore } from "@/features/cv/stores/cv-store-provider";

  /** Personal/contact info form (rendered inside the "Informasi Pribadi" panel). */
  export function PersonalForm() {
    const personal = useCvStore((s) => s.personal);
    const setPersonal = useCvStore((s) => s.setPersonal);

    return (
      <FieldGroup>
        <div className="mb-4">
          <FieldLabel>Foto Profile</FieldLabel>
          <div className="mt-1.5">
            <PhotoField />
          </div>
        </div>
        <div className="grid gap-4 @md/field-group:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fullName">Nama</FieldLabel>
            <Input
              id="fullName"
              value={personal.fullName ?? ""}
              onChange={(e) => setPersonal({ fullName: e.target.value })}
              placeholder="Jane Doe"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="headline">Posisi</FieldLabel>
            <Input
              id="headline"
              value={personal.headline ?? ""}
              onChange={(e) => setPersonal({ headline: e.target.value })}
              placeholder="Senior Frontend Engineer"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              value={personal.email ?? ""}
              onChange={(e) => setPersonal({ email: e.target.value })}
              placeholder="jane@example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">No. HP</FieldLabel>
            <Input
              id="phone"
              value={personal.phone ?? ""}
              onChange={(e) => setPersonal({ phone: e.target.value })}
              placeholder="+62 812 3456 7890"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="location">Alamat</FieldLabel>
            <Input
              id="location"
              value={personal.location ?? ""}
              onChange={(e) => setPersonal({ location: e.target.value })}
              placeholder="Jakarta, Indonesia"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="website">Website / Media Sosial</FieldLabel>
            <Input
              id="website"
              value={personal.website ?? ""}
              onChange={(e) => setPersonal({ website: e.target.value })}
              placeholder="janedoe.dev"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="linkedin">LinkedIn</FieldLabel>
            <Input
              id="linkedin"
              value={personal.linkedin ?? ""}
              onChange={(e) => setPersonal({ linkedin: e.target.value })}
              placeholder="linkedin.com/in/janedoe"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="github">GitHub</FieldLabel>
            <Input
              id="github"
              value={personal.github ?? ""}
              onChange={(e) => setPersonal({ github: e.target.value })}
              placeholder="github.com/janedoe"
            />
          </Field>
        </div>
      </FieldGroup>
    );
  }
  ```

- [ ] **Step 3: Verifikasi lint**

  ```bash
  bun lint
  ```

  Expected: tidak ada error Biome.

- [ ] **Step 4: Commit**

  ```bash
  git add features/cv/components/panels/photo-field.tsx features/cv/components/panels/personal-form.tsx
  git commit -m "feat: add PhotoField UI to PersonalForm with UploadThing"
  ```

---

### Task 4: Template `executive` + registry & colors setup

**Files:**
- Modify: `features/cv/components/templates/registry.ts`
- Modify: `features/cv/components/templates/template-colors.ts`
- Create: `features/cv/components/templates/executive.tsx`

**Interfaces:**
- Consumes: `TemplateProps` (`{ cv: CvContent }`) dari `./shared`
- Consumes: `formatDateRange`, `join` dari `./shared`
- Consumes: `cv.personal.photo?: string` — render kondisional

- [ ] **Step 1: Tambah kategori `"creative"` ke `registry.ts`**

  Di `features/cv/components/templates/registry.ts`, update type `TemplateCategory`:

  ```ts
  export type TemplateCategory =
    | "professional"
    | "ats"
    | "fresh-graduate"
    | "one-column"
    | "two-column"
    | "creative"
    | "new";
  ```

  Dan tambahkan entry di `TEMPLATE_CATEGORIES`:

  ```ts
  export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
    { id: "professional", label: "Profesional" },
    { id: "ats", label: "ATS" },
    { id: "fresh-graduate", label: "Fresh Graduate" },
    { id: "creative", label: "Kreatif" },
    { id: "one-column", label: "1 Kolom" },
    { id: "two-column", label: "2 Kolom" },
    { id: "new", label: "Baru" },
  ];
  ```

- [ ] **Step 2: Tambah default colors & fonts untuk semua 4 template di `template-colors.ts`**

  Tambahkan 4 entry ke `TEMPLATE_DEFAULT_COLORS`:

  ```ts
  executive: {
    presetId: "custom",
    background: "#ffffff",
    heading: "#1a1a2e",
    text: "#2d2d2d",
    link: "#3a3a6e",
    accent: "#16213e",
  },
  creative: {
    presetId: "custom",
    background: "#ffffff",
    heading: "#1f1d2b",
    text: "#3d3d3d",
    link: "#6c63ff",
    accent: "#6c63ff",
  },
  elegant: {
    presetId: "custom",
    background: "#fffaf7",
    heading: "#4a3728",
    text: "#5a5a5a",
    link: "#c9956c",
    accent: "#c9956c",
  },
  compact: {
    presetId: "custom",
    background: "#ffffff",
    heading: "#0d3b66",
    text: "#333333",
    link: "#0d3b66",
    accent: "#0d3b66",
  },
  ```

  Tambahkan 4 entry ke `TEMPLATE_DEFAULT_FONTS`:

  ```ts
  executive: { fontHeading: "source-serif", fontBody: "source-serif" },
  creative: { fontHeading: "inter", fontBody: "inter" },
  elegant: { fontHeading: "lora", fontBody: "lora" },
  compact: { fontHeading: "roboto", fontBody: "roboto" },
  ```

- [ ] **Step 3: Buat `features/cv/components/templates/executive.tsx`**

  Template Executive: single column, header band penuh lebar, foto bulat kanan atas.

  ```tsx
  import { formatDateRange, join, type TemplateProps } from "./shared";

  /**
   * Executive template. Single-column with a full-width dark header band.
   * Profile photo (if provided) appears as a circle on the right side of the header.
   * Formal, serif typography — suited for senior professionals and executives.
   */
  export function ExecutiveTemplate({ cv }: TemplateProps) {
    const p = cv.personal;

    return (
      <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]">
        {/* Header band */}
        <header className="bg-[var(--cv-color-accent)] px-10 py-8 print:[print-color-adjust:exact]">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-[1.6em] font-bold leading-tight text-[var(--cv-color-on-accent)] font-[family-name:var(--cv-font-heading)]">
                {p.fullName || "Nama Anda"}
              </h1>
              {p.headline ? (
                <p className="mt-1 text-[0.95em] text-[var(--cv-color-on-accent)] opacity-75">
                  {p.headline}
                </p>
              ) : null}
              {/* Contact row */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.78em] text-[var(--cv-color-on-accent)] opacity-70">
                {p.email ? <span>{p.email}</span> : null}
                {p.phone ? <span>{p.phone}</span> : null}
                {p.location ? <span>{p.location}</span> : null}
                {p.website ? <span>{p.website}</span> : null}
                {p.linkedin ? <span>{p.linkedin}</span> : null}
                {p.github ? <span>{p.github}</span> : null}
              </div>
            </div>
            {/* Photo — only rendered when provided */}
            {p.photo ? (
              <div className="shrink-0">
                <img
                  src={p.photo}
                  alt={p.fullName || "Foto profile"}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-[var(--cv-color-on-accent)]/30"
                />
              </div>
            ) : null}
          </div>
        </header>

        {/* Body */}
        <div className="px-10 py-7">
          {cv.summary?.trim() ? (
            <Section title="Ringkasan Profil">
              <p className="whitespace-pre-line">{cv.summary}</p>
            </Section>
          ) : null}

          {cv.experience.length > 0 ? (
            <Section title="Pengalaman Kerja">
              <div className="space-y-4">
                {cv.experience.map((exp, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)]">
                        {exp.role || "Posisi"}
                      </h3>
                      <span className="shrink-0 text-[0.82em] opacity-60">
                        {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                      </span>
                    </div>
                    <p className="text-[0.88em] font-medium opacity-75">
                      {join([exp.company, exp.location])}
                    </p>
                    {exp.description ? (
                      <p className="mt-1 whitespace-pre-line text-[0.93em]">
                        {exp.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.education.length > 0 ? (
            <Section title="Pendidikan">
              <div className="space-y-3">
                {cv.education.map((edu, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)]">
                        {edu.school || "Institusi"}
                      </h3>
                      <span className="shrink-0 text-[0.82em] opacity-60">
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>
                    <p className="text-[0.88em]">
                      {join([edu.degree, edu.field], ", ")}
                      {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <div className="grid grid-cols-2 gap-8">
            {cv.skills.length > 0 ? (
              <Section title="Keahlian">
                <ul className="space-y-1 text-[0.88em]">
                  {cv.skills.filter((s) => s.name.trim()).map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--cv-color-accent)]" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {cv.languages.length > 0 ? (
              <Section title="Bahasa">
                <ul className="space-y-1 text-[0.88em]">
                  {cv.languages.filter((l) => l.name.trim()).map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{l.name}</span>
                      {l.level ? <span className="opacity-60">{l.level}</span> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>

          {cv.certifications.length > 0 ? (
            <Section title="Sertifikasi">
              <div className="space-y-2">
                {cv.certifications.map((c, i) => (
                  <div key={i}>
                    <p className="font-medium text-[var(--cv-color-heading)] text-[0.9em]">{c.name}</p>
                    {join([c.issuer, c.date]) ? (
                      <p className="text-[0.82em] opacity-65">{join([c.issuer, c.date])}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.projects.length > 0 ? (
            <Section title="Proyek">
              <div className="space-y-3">
                {cv.projects.map((proj, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                        {proj.name}
                        {proj.type ? <span className="font-normal opacity-70"> — {proj.type}</span> : null}
                      </h3>
                      {proj.date ? <span className="shrink-0 text-[0.82em] opacity-60">{proj.date}</span> : null}
                    </div>
                    {proj.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{proj.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.organizations.length > 0 ? (
            <Section title="Organisasi">
              <div className="space-y-3">
                {cv.organizations.map((org, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                        {org.role || "Posisi"}
                        {org.name ? <span className="font-normal opacity-70"> — {org.name}</span> : null}
                      </h3>
                      {org.date ? <span className="shrink-0 text-[0.82em] opacity-60">{org.date}</span> : null}
                    </div>
                    {org.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{org.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.interpersonal.length > 0 ? (
            <Section title="Keahlian Interpersonal">
              <p className="text-[0.88em]">
                {join(cv.interpersonal.map((s) => s.name), ", ")}
              </p>
            </Section>
          ) : null}

          {cv.custom.length > 0 ? (
            <Section title="Tambahan">
              <div className="space-y-2">
                {cv.custom.map((item, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </article>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mt-6 first:mt-0">
        <h2 className="mb-2.5 border-b-2 border-[var(--cv-color-accent)] pb-1 text-[0.75em] font-bold uppercase tracking-[0.12em] text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
          {title}
        </h2>
        {children}
      </section>
    );
  }
  ```

- [ ] **Step 4: Verifikasi lint**

  ```bash
  bun lint
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add features/cv/components/templates/registry.ts features/cv/components/templates/template-colors.ts features/cv/components/templates/executive.tsx
  git commit -m "feat: add executive template with photo support"
  ```

---

### Task 5: Template `creative`

**Files:**
- Create: `features/cv/components/templates/creative.tsx`

**Interfaces:**
- Consumes: `TemplateProps`, `formatDateRange`, `join` dari `./shared`
- Consumes: `cv.personal.photo?: string`

- [ ] **Step 1: Buat `features/cv/components/templates/creative.tsx`**

  Template Creative: dua kolom — sidebar kiri 40% dengan foto persegi rounded di atas, main kanan.

  ```tsx
  import { formatDateRange, join, type TemplateProps } from "./shared";

  /**
   * Creative two-column template. Wide left sidebar (40%) holds photo, contact,
   * skills and languages. Right main column holds narrative sections.
   * Bold accent color — suited for designers, marketers, and creative professionals.
   */
  export function CreativeTemplate({ cv }: TemplateProps) {
    const p = cv.personal;

    return (
      <article className="mx-auto grid min-h-[1123px] w-full max-w-[794px] grid-cols-1 bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm sm:grid-cols-[40%_1fr] print:min-h-[297mm] print:grid-cols-[40%_1fr] print:[print-color-adjust:exact]">
        {/* Sidebar */}
        <aside className="bg-[var(--cv-color-accent)] p-7 text-[var(--cv-color-on-accent)] print:[print-color-adjust:exact]">
          {/* Photo */}
          {p.photo ? (
            <div className="mb-5">
              <img
                src={p.photo}
                alt={p.fullName || "Foto profile"}
                className="h-28 w-28 rounded-lg object-cover ring-4 ring-[var(--cv-color-on-accent)]/20"
              />
            </div>
          ) : null}

          <h1 className="text-[1.25em] font-bold leading-tight font-[family-name:var(--cv-font-heading)]">
            {p.fullName || "Nama Anda"}
          </h1>
          {p.headline ? (
            <p className="mt-1 text-[0.88em] opacity-75">{p.headline}</p>
          ) : null}

          <SideSection title="Kontak">
            <ul className="space-y-1.5 break-words text-[0.83em] opacity-85">
              {p.email ? <li>{p.email}</li> : null}
              {p.phone ? <li>{p.phone}</li> : null}
              {p.location ? <li>{p.location}</li> : null}
              {p.website ? <li>{p.website}</li> : null}
              {p.linkedin ? <li>{p.linkedin}</li> : null}
              {p.github ? <li>{p.github}</li> : null}
            </ul>
          </SideSection>

          {cv.skills.length > 0 ? (
            <SideSection title="Keahlian">
              <ul className="space-y-2">
                {cv.skills.filter((s) => s.name.trim()).map((s, i) => (
                  <li key={i}>
                    <span className="text-[0.83em]">{s.name}</span>
                    <span
                      className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[var(--cv-color-on-accent)]/20"
                      aria-hidden
                    >
                      <span
                        className="h-full rounded-full bg-[var(--cv-color-on-accent)]/80"
                        style={{ width: `${((6 - s.level) / 5) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}

          {cv.interpersonal.length > 0 ? (
            <SideSection title="Interpersonal">
              <p className="text-[0.83em] opacity-85">
                {join(cv.interpersonal.map((s) => s.name), ", ")}
              </p>
            </SideSection>
          ) : null}

          {cv.languages.length > 0 ? (
            <SideSection title="Bahasa">
              <ul className="space-y-1 text-[0.83em] opacity-85">
                {cv.languages.filter((l) => l.name.trim()).map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{l.name}</span>
                    {l.level ? <span className="opacity-70">{l.level}</span> : null}
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}

          {cv.certifications.length > 0 ? (
            <SideSection title="Sertifikasi">
              <ul className="space-y-2 text-[0.83em] opacity-85">
                {cv.certifications.map((c, i) => (
                  <li key={i}>
                    <p className="font-medium opacity-100">{c.name}</p>
                    {join([c.issuer, c.date]) ? (
                      <p className="opacity-70">{join([c.issuer, c.date])}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}
        </aside>

        {/* Main */}
        <div className="p-8">
          {cv.summary?.trim() ? (
            <MainSection title="Profil">
              <p className="whitespace-pre-line">{cv.summary}</p>
            </MainSection>
          ) : null}

          {cv.experience.length > 0 ? (
            <MainSection title="Pengalaman">
              <div className="space-y-4">
                {cv.experience.map((exp, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)]">
                        {exp.role || "Posisi"}
                      </h3>
                      <span className="shrink-0 text-[0.82em] opacity-60">
                        {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                      </span>
                    </div>
                    <p className="text-[0.85em] font-medium opacity-75">
                      {join([exp.company, exp.location])}
                    </p>
                    {exp.description ? (
                      <p className="mt-1 whitespace-pre-line text-[0.9em]">{exp.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.projects.length > 0 ? (
            <MainSection title="Proyek">
              <div className="space-y-3">
                {cv.projects.map((proj, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                        {proj.name}
                        {proj.type ? <span className="font-normal opacity-70"> — {proj.type}</span> : null}
                      </h3>
                      {proj.date ? <span className="shrink-0 text-[0.82em] opacity-60">{proj.date}</span> : null}
                    </div>
                    {proj.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{proj.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.education.length > 0 ? (
            <MainSection title="Pendidikan">
              <div className="space-y-3">
                {cv.education.map((edu, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)]">
                        {edu.school || "Institusi"}
                      </h3>
                      <span className="shrink-0 text-[0.82em] opacity-60">
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>
                    <p className="text-[0.88em]">
                      {join([edu.degree, edu.field], ", ")}
                      {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.organizations.length > 0 ? (
            <MainSection title="Organisasi">
              <div className="space-y-3">
                {cv.organizations.map((org, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                        {org.role || "Posisi"}
                        {org.name ? <span className="font-normal opacity-70"> — {org.name}</span> : null}
                      </h3>
                      {org.date ? <span className="shrink-0 text-[0.82em] opacity-60">{org.date}</span> : null}
                    </div>
                    {org.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{org.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.custom.length > 0 ? (
            <MainSection title="Tambahan">
              <div className="space-y-2">
                {cv.custom.map((item, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}
        </div>
      </article>
    );
  }

  function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mt-5">
        <h2 className="mb-2 text-[0.62em] font-bold uppercase tracking-widest opacity-55 font-[family-name:var(--cv-font-heading)]">
          {title}
        </h2>
        {children}
      </section>
    );
  }

  function MainSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mt-5 first:mt-0">
        <h2 className="mb-2 border-b-2 border-[var(--cv-color-accent)] pb-1 text-[0.82em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
          {title}
        </h2>
        {children}
      </section>
    );
  }
  ```

- [ ] **Step 2: Verifikasi lint**

  ```bash
  bun lint
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add features/cv/components/templates/creative.tsx
  git commit -m "feat: add creative template with photo support"
  ```

---

### Task 6: Template `elegant`

**Files:**
- Create: `features/cv/components/templates/elegant.tsx`

**Interfaces:**
- Consumes: `TemplateProps`, `formatDateRange`, `join` dari `./shared`
- Consumes: `cv.personal.photo?: string`

- [ ] **Step 1: Buat `features/cv/components/templates/elegant.tsx`**

  Template Elegant: single column centered header, foto bulat besar di tengah atas nama, serif premium.

  ```tsx
  import { formatDateRange, join, type TemplateProps } from "./shared";

  /**
   * Elegant single-column template. Centered header with a large circular photo,
   * serif typography, soft warm palette, and generous whitespace.
   * Suited for consultants, educators, and anyone wanting a refined look.
   */
  export function ElegantTemplate({ cv }: TemplateProps) {
    const p = cv.personal;

    return (
      <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]">
        {/* Centered header */}
        <header className="px-12 pt-10 pb-6 text-center">
          {p.photo ? (
            <div className="mb-4 flex justify-center">
              <img
                src={p.photo}
                alt={p.fullName || "Foto profile"}
                className="h-24 w-24 rounded-full object-cover ring-2 ring-[var(--cv-color-accent)]/40"
              />
            </div>
          ) : null}
          <h1 className="text-[1.7em] font-bold tracking-wide text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
            {p.fullName || "Nama Anda"}
          </h1>
          {p.headline ? (
            <p className="mt-1.5 text-[0.95em] italic text-[var(--cv-color-accent)]">
              {p.headline}
            </p>
          ) : null}
          {/* Contact row */}
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[0.8em] opacity-70">
            {p.email ? <span>{p.email}</span> : null}
            {p.phone ? <span>{p.phone}</span> : null}
            {p.location ? <span>{p.location}</span> : null}
            {p.website ? <span>{p.website}</span> : null}
            {p.linkedin ? <span>{p.linkedin}</span> : null}
            {p.github ? <span>{p.github}</span> : null}
          </div>
          {/* Ornamental divider */}
          <div className="mx-auto mt-5 h-px w-24 bg-[var(--cv-color-accent)]/50" />
        </header>

        {/* Body */}
        <div className="px-12 pb-10">
          {cv.summary?.trim() ? (
            <Section title="Tentang Saya">
              <p className="whitespace-pre-line text-center italic opacity-80">{cv.summary}</p>
            </Section>
          ) : null}

          {cv.experience.length > 0 ? (
            <Section title="Pengalaman">
              <div className="space-y-5">
                {cv.experience.map((exp, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)]">
                        {exp.role || "Posisi"}
                      </h3>
                      <span className="shrink-0 text-[0.82em] italic opacity-55">
                        {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                      </span>
                    </div>
                    <p className="text-[0.88em] text-[var(--cv-color-accent)]">
                      {join([exp.company, exp.location])}
                    </p>
                    {exp.description ? (
                      <p className="mt-1.5 whitespace-pre-line text-[0.92em]">{exp.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.education.length > 0 ? (
            <Section title="Pendidikan">
              <div className="space-y-4">
                {cv.education.map((edu, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)]">
                        {edu.school || "Institusi"}
                      </h3>
                      <span className="shrink-0 text-[0.82em] italic opacity-55">
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>
                    <p className="text-[0.88em]">
                      {join([edu.degree, edu.field], ", ")}
                      {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <div className="grid grid-cols-2 gap-10">
            {cv.skills.length > 0 ? (
              <Section title="Keahlian">
                <ul className="space-y-1 text-[0.88em]">
                  {cv.skills.filter((s) => s.name.trim()).map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[var(--cv-color-accent)]">✦</span>
                      {s.name}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {cv.languages.length > 0 ? (
              <Section title="Bahasa">
                <ul className="space-y-1 text-[0.88em]">
                  {cv.languages.filter((l) => l.name.trim()).map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{l.name}</span>
                      {l.level ? <span className="italic opacity-60">{l.level}</span> : null}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>

          {cv.certifications.length > 0 ? (
            <Section title="Sertifikasi">
              <div className="space-y-2">
                {cv.certifications.map((c, i) => (
                  <div key={i}>
                    <p className="font-medium text-[var(--cv-color-heading)] text-[0.9em]">{c.name}</p>
                    {join([c.issuer, c.date]) ? (
                      <p className="text-[0.82em] italic opacity-60">{join([c.issuer, c.date])}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.projects.length > 0 ? (
            <Section title="Proyek">
              <div className="space-y-3">
                {cv.projects.map((proj, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                        {proj.name}
                        {proj.type ? <span className="font-normal opacity-70"> — {proj.type}</span> : null}
                      </h3>
                      {proj.date ? <span className="shrink-0 text-[0.82em] italic opacity-55">{proj.date}</span> : null}
                    </div>
                    {proj.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{proj.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.organizations.length > 0 ? (
            <Section title="Organisasi">
              <div className="space-y-3">
                {cv.organizations.map((org, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                        {org.role || "Posisi"}
                        {org.name ? <span className="font-normal opacity-70"> — {org.name}</span> : null}
                      </h3>
                      {org.date ? <span className="shrink-0 text-[0.82em] italic opacity-55">{org.date}</span> : null}
                    </div>
                    {org.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{org.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.interpersonal.length > 0 ? (
            <Section title="Keahlian Interpersonal">
              <p className="text-[0.88em]">
                {join(cv.interpersonal.map((s) => s.name), "  ·  ")}
              </p>
            </Section>
          ) : null}

          {cv.custom.length > 0 ? (
            <Section title="Tambahan">
              <div className="space-y-2">
                {cv.custom.map((item, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.88em]">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </article>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mt-7 first:mt-0">
        <h2 className="mb-3 text-center text-[0.72em] font-bold uppercase tracking-[0.18em] text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
          {title}
        </h2>
        <div className="mx-auto mb-3 h-px w-full bg-[var(--cv-color-accent)]/20" />
        {children}
      </section>
    );
  }
  ```

- [ ] **Step 2: Verifikasi lint**

  ```bash
  bun lint
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add features/cv/components/templates/elegant.tsx
  git commit -m "feat: add elegant template with photo support"
  ```

---

### Task 7: Template `compact`

**Files:**
- Create: `features/cv/components/templates/compact.tsx`

**Interfaces:**
- Consumes: `TemplateProps`, `formatDateRange`, `join` dari `./shared`
- Consumes: `cv.personal.photo?: string`

- [ ] **Step 1: Buat `features/cv/components/templates/compact.tsx`**

  Template Compact: dua kolom padat, foto kecil square pojok kiri header, maximalis konten.

  ```tsx
  import { formatDateRange, join, type TemplateProps } from "./shared";

  /**
   * Compact two-column template. Dense layout maximizing content per page.
   * Small square photo in the top-left of the header area.
   * Left column (35%) for contact, skills, languages; right for main sections.
   * Suited for experienced professionals with extensive backgrounds.
   */
  export function CompactTemplate({ cv }: TemplateProps) {
    const p = cv.personal;

    return (
      <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]">
        {/* Header */}
        <header className="border-b-4 border-[var(--cv-color-accent)] px-8 py-5 print:[print-color-adjust:exact]">
          <div className="flex items-start gap-4">
            {p.photo ? (
              <img
                src={p.photo}
                alt={p.fullName || "Foto profile"}
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
            ) : null}
            <div className="flex-1">
              <h1 className="text-[1.4em] font-bold leading-tight text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
                {p.fullName || "Nama Anda"}
              </h1>
              {p.headline ? (
                <p className="mt-0.5 text-[0.9em] font-medium text-[var(--cv-color-accent)]">
                  {p.headline}
                </p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.75em] opacity-65">
                {p.email ? <span>{p.email}</span> : null}
                {p.phone ? <span>{p.phone}</span> : null}
                {p.location ? <span>{p.location}</span> : null}
                {p.website ? <span>{p.website}</span> : null}
                {p.linkedin ? <span>{p.linkedin}</span> : null}
                {p.github ? <span>{p.github}</span> : null}
              </div>
            </div>
          </div>
        </header>

        {/* Body grid */}
        <div className="grid grid-cols-1 sm:grid-cols-[35%_1fr] print:grid-cols-[35%_1fr]">
          {/* Left sidebar */}
          <aside className="border-r border-[var(--cv-color-accent)]/15 px-6 py-5">
            {cv.skills.length > 0 ? (
              <SideSection title="Keahlian">
                <ul className="space-y-1 text-[0.82em]">
                  {cv.skills.filter((s) => s.name.trim()).map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--cv-color-accent)]" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </SideSection>
            ) : null}

            {cv.interpersonal.length > 0 ? (
              <SideSection title="Interpersonal">
                <ul className="space-y-1 text-[0.82em]">
                  {cv.interpersonal.filter((s) => s.name.trim()).map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--cv-color-accent)]" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </SideSection>
            ) : null}

            {cv.languages.length > 0 ? (
              <SideSection title="Bahasa">
                <ul className="space-y-1 text-[0.82em]">
                  {cv.languages.filter((l) => l.name.trim()).map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{l.name}</span>
                      {l.level ? <span className="opacity-60">{l.level}</span> : null}
                    </li>
                  ))}
                </ul>
              </SideSection>
            ) : null}

            {cv.certifications.length > 0 ? (
              <SideSection title="Sertifikasi">
                <ul className="space-y-2 text-[0.82em]">
                  {cv.certifications.map((c, i) => (
                    <li key={i}>
                      <p className="font-medium text-[var(--cv-color-heading)]">{c.name}</p>
                      {join([c.issuer, c.date]) ? (
                        <p className="opacity-60">{join([c.issuer, c.date])}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </SideSection>
            ) : null}

            {cv.organizations.length > 0 ? (
              <SideSection title="Organisasi">
                <div className="space-y-2 text-[0.82em]">
                  {cv.organizations.map((org, i) => (
                    <div key={i}>
                      <p className="font-medium text-[var(--cv-color-heading)]">
                        {org.role || "Posisi"}
                      </p>
                      {org.name ? <p className="opacity-70">{org.name}</p> : null}
                      {org.date ? <p className="opacity-50 text-[0.9em]">{org.date}</p> : null}
                    </div>
                  ))}
                </div>
              </SideSection>
            ) : null}
          </aside>

          {/* Main content */}
          <div className="px-6 py-5">
            {cv.summary?.trim() ? (
              <MainSection title="Profil">
                <p className="whitespace-pre-line text-[0.9em]">{cv.summary}</p>
              </MainSection>
            ) : null}

            {cv.experience.length > 0 ? (
              <MainSection title="Pengalaman">
                <div className="space-y-3">
                  {cv.experience.map((exp, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                          {exp.role || "Posisi"}
                        </h3>
                        <span className="shrink-0 text-[0.78em] opacity-55">
                          {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                        </span>
                      </div>
                      <p className="text-[0.82em] font-medium opacity-70">
                        {join([exp.company, exp.location])}
                      </p>
                      {exp.description ? (
                        <p className="mt-0.5 whitespace-pre-line text-[0.85em]">{exp.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </MainSection>
            ) : null}

            {cv.education.length > 0 ? (
              <MainSection title="Pendidikan">
                <div className="space-y-2">
                  {cv.education.map((edu, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                          {edu.school || "Institusi"}
                        </h3>
                        <span className="shrink-0 text-[0.78em] opacity-55">
                          {formatDateRange(edu.startDate, edu.endDate)}
                        </span>
                      </div>
                      <p className="text-[0.82em]">
                        {join([edu.degree, edu.field], ", ")}
                        {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </MainSection>
            ) : null}

            {cv.projects.length > 0 ? (
              <MainSection title="Proyek">
                <div className="space-y-2">
                  {cv.projects.map((proj, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">
                          {proj.name}
                          {proj.type ? <span className="font-normal opacity-65"> — {proj.type}</span> : null}
                        </h3>
                        {proj.date ? <span className="shrink-0 text-[0.78em] opacity-55">{proj.date}</span> : null}
                      </div>
                      {proj.description ? (
                        <p className="mt-0.5 whitespace-pre-line text-[0.85em]">{proj.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </MainSection>
            ) : null}

            {cv.custom.length > 0 ? (
              <MainSection title="Tambahan">
                <div className="space-y-2">
                  {cv.custom.map((item, i) => (
                    <div key={i}>
                      <h3 className="font-semibold text-[var(--cv-color-heading)] text-[0.9em]">{item.title}</h3>
                      {item.description ? (
                        <p className="mt-0.5 whitespace-pre-line text-[0.85em]">{item.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </MainSection>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mb-4">
        <h2 className="mb-1.5 text-[0.62em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
          {title}
        </h2>
        {children}
      </section>
    );
  }

  function MainSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <section className="mb-4 first:mt-0">
        <h2 className="mb-1.5 border-b border-[var(--cv-color-accent)]/25 pb-0.5 text-[0.72em] font-bold uppercase tracking-widest text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
          {title}
        </h2>
        {children}
      </section>
    );
  }
  ```

- [ ] **Step 2: Verifikasi lint**

  ```bash
  bun lint
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add features/cv/components/templates/compact.tsx
  git commit -m "feat: add compact template with photo support"
  ```

---

### Task 8: Daftarkan semua 4 template di registry

**Files:**
- Modify: `features/cv/components/templates/index.ts`
- Modify: `features/cv/components/templates/eager.ts`

**Interfaces:**
- Consumes: `ExecutiveTemplate`, `CreativeTemplate`, `ElegantTemplate`, `CompactTemplate` dari file masing-masing
- Produces: template tersedia via `getTemplate(id)` dan `getEagerTemplate(id)`

- [ ] **Step 1: Update `features/cv/components/templates/index.ts`**

  Tambahkan 4 lazy imports dan 4 entry ke `TEMPLATES[]`:

  ```ts
  import { lazy } from "react";
  import type { TemplateMeta, TemplateRegistry } from "./registry";

  const ClassicLazy = lazy(() =>
    import("./classic").then((m) => ({ default: m.ClassicTemplate })),
  );
  const ModernLazy = lazy(() =>
    import("./modern").then((m) => ({ default: m.ModernTemplate })),
  );
  const ProfessionalLazy = lazy(() =>
    import("./professional").then((m) => ({ default: m.ProfessionalTemplate })),
  );
  const MinimalLazy = lazy(() =>
    import("./minimal").then((m) => ({ default: m.MinimalTemplate })),
  );
  const FreshGraduateLazy = lazy(() =>
    import("./fresh-graduate").then((m) => ({
      default: m.FreshGraduateTemplate,
    })),
  );
  const ExecutiveLazy = lazy(() =>
    import("./executive").then((m) => ({ default: m.ExecutiveTemplate })),
  );
  const CreativeLazy = lazy(() =>
    import("./creative").then((m) => ({ default: m.CreativeTemplate })),
  );
  const ElegantLazy = lazy(() =>
    import("./elegant").then((m) => ({ default: m.ElegantTemplate })),
  );
  const CompactLazy = lazy(() =>
    import("./compact").then((m) => ({ default: m.CompactTemplate })),
  );

  export const TEMPLATES: TemplateMeta[] = [
    {
      id: "classic",
      name: "Classic",
      description: "Satu kolom, ramah ATS, rapi dan netral.",
      categories: ["ats", "professional", "one-column"],
      lazyComponent: ClassicLazy,
    },
    {
      id: "modern",
      name: "Modern",
      description: "Dua kolom dengan sidebar gelap untuk kontak & keahlian.",
      categories: ["professional", "two-column", "new"],
      lazyComponent: ModernLazy,
    },
    {
      id: "professional",
      name: "Professional",
      description: "Header berwarna dengan aksen, cocok untuk profesional.",
      categories: ["professional", "one-column", "new"],
      lazyComponent: ProfessionalLazy,
    },
    {
      id: "minimal",
      name: "Minimal",
      description: "Bersih dan lapang, judul di tengah. Ramah ATS.",
      categories: ["ats", "one-column", "professional"],
      lazyComponent: MinimalLazy,
    },
    {
      id: "fresh-graduate",
      name: "Fresh Graduate",
      description: "Menonjolkan pendidikan & keahlian untuk pemula.",
      categories: ["fresh-graduate", "two-column", "new"],
      lazyComponent: FreshGraduateLazy,
    },
    {
      id: "executive",
      name: "Executive",
      description: "Header band elegan dengan foto, formal untuk profesional senior.",
      categories: ["professional", "one-column", "new"],
      lazyComponent: ExecutiveLazy,
    },
    {
      id: "creative",
      name: "Creative",
      description: "Sidebar bold dengan foto, cocok untuk desainer & kreator.",
      categories: ["creative", "two-column", "new"],
      lazyComponent: CreativeLazy,
    },
    {
      id: "elegant",
      name: "Elegant",
      description: "Header terpusat dengan foto bulat, serif premium.",
      categories: ["professional", "one-column", "new"],
      lazyComponent: ElegantLazy,
    },
    {
      id: "compact",
      name: "Compact",
      description: "Tata letak padat dua kolom, cocok untuk CV panjang.",
      categories: ["professional", "two-column", "ats"],
      lazyComponent: CompactLazy,
    },
  ];

  export const TEMPLATE_REGISTRY: TemplateRegistry = TEMPLATES.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as TemplateRegistry,
  );

  export const DEFAULT_TEMPLATE_ID = "classic";

  export function getTemplate(id: string | undefined): TemplateMeta {
    return (
      (id ? TEMPLATE_REGISTRY[id] : undefined) ??
      TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID]
    );
  }

  export type {
    TemplateCategory,
    TemplateMeta,
  } from "./registry";
  export { TEMPLATE_CATEGORIES } from "./registry";
  ```

- [ ] **Step 2: Update `features/cv/components/templates/eager.ts`**

  ```ts
  import type { ComponentType } from "react";
  import { ClassicTemplate } from "./classic";
  import { CompactTemplate } from "./compact";
  import { CreativeTemplate } from "./creative";
  import { ElegantTemplate } from "./elegant";
  import { ExecutiveTemplate } from "./executive";
  import { FreshGraduateTemplate } from "./fresh-graduate";
  import { DEFAULT_TEMPLATE_ID } from "./index";
  import { MinimalTemplate } from "./minimal";
  import { ModernTemplate } from "./modern";
  import { ProfessionalTemplate } from "./professional";
  import type { TemplateProps } from "./registry";

  const EAGER_TEMPLATES: Record<string, ComponentType<TemplateProps>> = {
    classic: ClassicTemplate,
    modern: ModernTemplate,
    professional: ProfessionalTemplate,
    minimal: MinimalTemplate,
    "fresh-graduate": FreshGraduateTemplate,
    executive: ExecutiveTemplate,
    creative: CreativeTemplate,
    elegant: ElegantTemplate,
    compact: CompactTemplate,
  };

  export function getEagerTemplate(
    id: string | undefined,
  ): ComponentType<TemplateProps> {
    return (
      (id ? EAGER_TEMPLATES[id] : undefined) ??
      EAGER_TEMPLATES[DEFAULT_TEMPLATE_ID]
    );
  }
  ```

- [ ] **Step 3: Jalankan lint dan build**

  ```bash
  bun lint
  ```

  ```bash
  bun build
  ```

  Expected: keduanya lulus tanpa error.

- [ ] **Step 4: Commit final**

  ```bash
  git add features/cv/components/templates/index.ts features/cv/components/templates/eager.ts
  git commit -m "feat: register executive, creative, elegant, compact templates in registry"
  ```

---

## Verifikasi Akhir

- [ ] `bun lint` — bersih
- [ ] `bun build` — berhasil
- [ ] Buka builder di browser → panel "Informasi Pribadi" → lihat PhotoField di atas form
- [ ] Panel "Template" → 9 template tersedia (5 lama + 4 baru), thumbnail render
- [ ] Pilih template `executive` → preview tampil, foto render jika ada
- [ ] Pilih template `creative` → foto di sidebar
- [ ] Pilih template `elegant` → foto bulat centered
- [ ] Pilih template `compact` → foto square kecil di header
- [ ] Export PDF dari tiap template baru → foto muncul di PDF
- [ ] Buka CV lama (tanpa foto) → semua template render tanpa error, layout rapi
- [ ] Hapus foto → layout kembali rapi di semua template baru
