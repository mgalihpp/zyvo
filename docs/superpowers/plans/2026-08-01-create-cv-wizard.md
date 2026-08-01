# Create CV Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti tombol "CV Baru" di dashboard agar membuka wizard full-page di `/builder/new` dengan pilihan Manual / Import / AI (bukan langsung create CV kosong).

**Architecture:** Reuse komponen `OnboardingWizard` yang sudah ada dengan tambahan prop `mode`. Route `/dashboard/ai` dan `AiGeneratorPage` dihapus karena alur AI sudah masuk wizard. Dashboard dan builder cukup ganti tombol create jadi `Link`/navigasi ke `/builder/new`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, tRPC v11, Biome v2, bun.

## Global Constraints

- Semua copy UI dalam Bahasa Indonesia (ikuti teks yang sudah ada).
- `@/*` alias → project root.
- Jangan tambah dependency baru.
- Verifikasi tiap task dengan `bun lint` dan `bun build` (tanpa dev server jalan).
- Ikuti gaya komponen yang ada (`Button`, `Link`, dsb dari `@/components/ui`).

---

### Task 1: StepChooseMethod — AI tetap jadi link, tanpa icon

**Files:**
- Modify: `features/onboarding/components/step-choose-method.tsx`

**Interfaces:**
- Consumes: `OnboardingMethod` type (sudah ada, tidak berubah).
- Produces: `StepChooseMethod` dengan 2 kartu (`manual | import`) + link `ai` di bawah.

- [ ] **Step 1: Hapus icon dari link AI**

Layout tetap dua kartu + link "Atau buat dengan AI" (sudah ada). Hanya bersihkan icon:

```tsx
import { FileUp, PenLine } from "lucide-react";
```

dan link menjadi teks polos:

```tsx
      <button
        type="button"
        onClick={() => onSelect("ai")}
        className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        Atau buat dengan AI
      </button>
```

- [ ] **Step 2: Verifikasi lint**

Run: `bun lint`
Expected: tidak ada error di file ini.

- [ ] **Step 3: Verifikasi build**

Run: `bun build`
Expected: build sukses.

- [ ] **Step 4: Commit**

```bash
git add features/onboarding/components/step-choose-method.tsx
git commit -m "revert: AI di step choose method kembali jadi link, hapus icon sparkles"
```

---

### Task 2: OnboardingWizard — prop `mode` + analytics

**Files:**
- Modify: `features/onboarding/components/onboarding-wizard.tsx`

**Interfaces:**
- Consumes: prop baru dari Task ini — dipakai Task 3 (`<OnboardingWizard mode="create" />`).
- Produces: `OnboardingWizard({ mode?: "onboarding" | "create" })`, default `"onboarding"` (perilaku lama).

- [ ] **Step 1: Tambah import + prop `mode` + analytics**

Tambahkan import setelah baris `import { trpc } from "@/lib/trpc/client";`:

```tsx
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
```

Ubah signature komponen (baris 100):

```tsx
export function OnboardingWizard({
  mode = "onboarding",
}: {
  mode?: "onboarding" | "create";
}) {
```

- [ ] **Step 2: Tambah hook analytics + track di createMutation**

Di dalam `OnboardingWizard`, tambahkan setelah `const router = useRouter();`:

```tsx
const analytics = useCVAnalytics();
```

Ubah `createMutation` (baris 116-121) menjadi:

```tsx
const createMutation = trpc.cv.create.useMutation({
  onSuccess: (cv) => {
    analytics.track("cv_created", { cv_id: cv.id });
    utils.cv.list.invalidate();
    router.push(`/builder/${cv.id}`);
  },
});
```

- [ ] **Step 3: Ubah `handleSkip` jadi `handleExit` sesuai mode**

Ganti fungsi `handleSkip` (baris 182-185) dengan:

```tsx
function handleExit() {
  if (mode === "create") {
    router.push("/dashboard");
    return;
  }
  document.cookie = `${ONBOARDING_SKIP_COOKIE}=1; path=/; max-age=31536000`;
  router.push("/dashboard");
}
```

- [ ] **Step 4: Ubah top bar (kiri step 1 + label tombol kanan)**

Ganti blok top bar (baris 193-212) menjadi:

```tsx
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
        ) : mode === "create" && !busy ? (
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <ArrowLeft data-icon="inline-start" />
            Kembali
          </Button>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" onClick={handleExit} disabled={busy}>
          {mode === "create" ? "Batal" : "Lewati"}
        </Button>
      </div>
```

- [ ] **Step 5: Verifikasi lint**

Run: `bun lint`
Expected: tidak ada error (misal unused `handleSkip` / import).

- [ ] **Step 6: Verifikasi build**

Run: `bun build`
Expected: build sukses.

- [ ] **Step 7: Commit**

```bash
git add features/onboarding/components/onboarding-wizard.tsx
git commit -m "feat: onboarding wizard dukung mode create (Batal tanpa cookie) + track cv_created"
```

---

### Task 3: Route baru `/builder/new`

**Files:**
- Create: `app/(dashboard)/builder/new/page.tsx`

**Interfaces:**
- Consumes: `<OnboardingWizard mode="create" />` dari Task 2.
- Produces: route `/builder/new` yang menampilkan wizard create.

- [ ] **Step 1: Buat file route**

Buat `app/(dashboard)/builder/new/page.tsx`:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({ title: "Buat CV" });

/** Full-page "buat CV baru" wizard — Manual / Import / AI. */
export default async function BuilderNewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  return <OnboardingWizard mode="create" />;
}
```

- [ ] **Step 2: Verifikasi build**

Run: `bun build`
Expected: build sukses, route terdaftar.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/builder/new/page.tsx"
git commit -m "feat: route /builder/new dengan wizard create CV"
```

---

### Task 4: Dashboard CvList — "CV Baru" jadi Link

**Files:**
- Modify: `features/cv/components/dashboard/cv-list.tsx`

**Interfaces:**
- Consumes: route `/builder/new` dari Task 3.
- Produces: kartu "CV Baru" sebagai `Link` ke `/builder/new`; `createMutation` dihapus.

- [ ] **Step 1: Hapus `createMutation`**

Hapus blok `createMutation` (baris 211-218):

```tsx
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      analytics.track("cv_created", { cv_id: cv.id });
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
    onError: (err) => toast.add({ title: err.message, type: "error" }),
  });
```

- [ ] **Step 2: Ganti kartu "CV Baru" jadi Link + hapus link AI**

Ganti seluruh blok `newCard` (baris 280-301) dengan:

```tsx
  // "New resume" card — dashed border, centered + icon.
  const newCard = showNewButton ? (
    <Link
      href="/builder/new"
      style={{ aspectRatio: "1 / 1.414" }}
      className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
        <PlusIcon className="size-5" />
      </span>
      CV Baru
    </Link>
  ) : null;
```

- [ ] **Step 3: Verifikasi lint**

Run: `bun lint`
Expected: tidak ada error unused import/variable (`createMutation` sudah tidak dipakai; `toast`, `router`, `utils`, `analytics` masih dipakai oleh duplicate/delete/rename/download).

- [ ] **Step 4: Verifikasi build**

Run: `bun build`
Expected: build sukses.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/dashboard/cv-list.tsx
git commit -m "feat: dashboard CV Baru buka wizard /builder/new, hapus link AI"
```

---

### Task 5: Builder panel-topbar — "Buat CV Baru" navigasi ke wizard

**Files:**
- Modify: `features/cv/components/panels/panel-topbar.tsx`

**Interfaces:**
- Consumes: route `/builder/new` dari Task 3.
- Produces: tombol "Buat CV Baru" melakukan `router.push("/builder/new")`; `createMutation` dihapus.

- [ ] **Step 1: Hapus `createMutation`**

Di `CvSwitcherDialog`, hapus blok (baris 177-187):

```tsx
  const upsell = usePlanUpsell();
  const createMutation = trpc.cv.create.useMutation({
    onError: upsell.handleError,
    onSuccess: async (cv) => {
      // Refresh the CV list so the switcher and dashboard reflect the new CV
      // immediately, then navigate into the freshly created editor.
      await utils.cv.list.invalidate();
      onClose();
      router.push(`/builder/${cv.id}`);
    },
  });
```

Catatan: `const upsell = usePlanUpsell();` (baris 177) JANGAN dihapus — `upsell.dialog` masih dirender di baris 317.

- [ ] **Step 2: Ganti tombol jadi navigasi**

Ganti tombol (baris 300-309):

```tsx
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={() => router.push("/builder/new")}
          >
            <PlusIcon data-icon="inline-start" />
            Buat CV Baru
          </Button>
```

- [ ] **Step 3: Verifikasi lint**

Run: `bun lint`
Expected: tidak ada error unused import (cek `createMutation` sudah tidak dipakai; `trpc`, `utils`, `onClose` masih dipakai).

- [ ] **Step 4: Verifikasi build**

Run: `bun build`
Expected: build sukses.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/panels/panel-topbar.tsx
git commit -m "feat: builder 'Buat CV Baru' pindah ke /builder/new"
```

---

### Task 6: Hapus route `/dashboard/ai` + `AiGeneratorPage`

**Files:**
- Delete: `app/(dashboard)/dashboard/ai/page.tsx`
- Delete: `features/ai/components/ai-generator-page.tsx`

**Interfaces:**
- Consumes: alur AI sudah tersedia via wizard (`StepAiGenerator` + `trpc.ai.generate`), tidak bergantung file ini.

- [ ] **Step 1: Cek referensi tersisa**

Run: `rg -n "AiGeneratorPage|dashboard/ai" app features --glob '!**/ai-generator-page.tsx' --glob '!**/dashboard/ai/page.tsx'`
Expected: hanya comment/doc yang tersisa (misal di `features/ai/components/ai-generator-page.tsx` itu sendiri, yang akan dihapus). Tidak ada import yang memakai file ini.

- [ ] **Step 2: Hapus kedua file**

```bash
git rm "app/(dashboard)/dashboard/ai/page.tsx"
git rm features/ai/components/ai-generator-page.tsx
```

- [ ] **Step 3: Verifikasi build**

Run: `bun build`
Expected: build sukses tanpa referensi ke file yang dihapus.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: hapus /dashboard/ai dan AiGeneratorPage (AI pindah ke wizard CV baru)"
```

---

### Task 7: Verifikasi akhir manual

**Files:** none.

- [ ] **Step 1: Lint + build penuh**

Run: `bun lint`
Run: `bun build`
Expected: keduanya bersih/sukses.

- [ ] **Step 2: Cek alur di dev server**

Run: `bun dev`, lalu manual:
1. Dashboard → klik "CV Baru" → wizard muncul di `/builder/new` (3 kartu: Buat Manual / Import CV / Buat dengan AI).
2. Pilih "Buat Manual" → pilih template → masuk builder CV kosong.
3. "Import CV" → upload/paste → CV terisi → masuk builder.
4. "Buat dengan AI" → form → CV terisi → masuk builder.
5. Klik "Batal" di step 1 → kembali ke `/dashboard`.
6. `/dashboard/ai` → 404.
7. Builder → "Pilih CV" → "Buat CV Baru" → `/builder/new`.
8. `/onboarding` untuk user tanpa CV → wizard tetap muncul (mode onboarding, tombol "Lewati").
