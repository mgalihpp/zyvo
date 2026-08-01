# How It Works Scroll-Jack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `#cara-kerja` landing section into a split layout — steps on the left, sticky live preview on the right — where scrolling advances the active step (300vh scroll region, one viewport per step).

**Architecture:** A new `useScrollStep` hook measures the section rect and maps scroll progress to an active index (pure function `stepIndexForProgress`, unit-tested). `how-it-works.tsx` becomes a client component: a `sticky top-0 h-screen` 2-col grid on `lg+`, a stacked fallback below `lg`. Preview panels reuse existing mocks from `feature-mocks.tsx`.

**Tech Stack:** React 19 (client component), Tailwind CSS v4, lucide-react, `bun test` (built-in test runner), Biome via `bun lint`.

## Global Constraints

- No new dependencies
- File edits limited to: `features/marketing/components/how-it-works.tsx` (rewrite), `features/marketing/hooks/use-scroll-step.ts` (new), `features/marketing/hooks/use-scroll-step.test.ts` (new)
- Keep the `HowItWorks` named export (imported via `dynamic()` in `app/page.tsx`) — no page/nav changes
- Indonesian copy for all `STEPS` content stays identical to the current values
- Reuse existing exports from `feature-mocks.tsx`: `AiToolbarMock`, `ColorPresetsMock`, `TypographyMock`, `ExportMock`, `AtsBadgeMock`
- Active step card gets `aria-current="step"`; preview panels are decorative (`aria-hidden`)
- Reduced motion: step index still advances (content), but panels use `motion-reduce:transition-none`
- Verification per task: `bun lint` PASS; commits follow repo style `feat(how-it-works): ...`

---

## Task 1: `useScrollStep` hook + pure mapping test

**Files:**
- Create: `features/marketing/hooks/use-scroll-step.ts`
- Create: `features/marketing/hooks/use-scroll-step.test.ts`

**Interfaces:**
- Produces:
  - `export function stepIndexForProgress(progress: number, count: number): number` — clamps `progress` to `[0, 1]` and returns `Math.floor(progress * count)` capped at `count - 1`.
  - `export function useScrollStep(count: number): { ref: RefObject<HTMLElement | null>; index: number; scrollToStep: (step: number) => void }`
  - `ref` attaches to the scroll region `<section>`; `index` is the active step (`0`-based); `scrollToStep(step)` smooth-scrolls to that step's boundary.
  - Requires the section to be `lg:h-[300vh]` (height set by the component) — the hook measures it at runtime.

- [ ] **Step 1: Write the failing test**

Create `features/marketing/hooks/use-scroll-step.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { stepIndexForProgress } from "./use-scroll-step";

describe("stepIndexForProgress", () => {
  test("clamps out-of-range progress", () => {
    expect(stepIndexForProgress(-1, 3)).toBe(0);
    expect(stepIndexForProgress(2, 3)).toBe(2);
  });

  test("maps progress to step boundaries", () => {
    expect(stepIndexForProgress(0, 3)).toBe(0);
    expect(stepIndexForProgress(0.33, 3)).toBe(0);
    expect(stepIndexForProgress(0.34, 3)).toBe(1);
    expect(stepIndexForProgress(0.67, 3)).toBe(1);
    expect(stepIndexForProgress(0.68, 3)).toBe(2);
    expect(stepIndexForProgress(1, 3)).toBe(2);
  });

  test("works for two steps", () => {
    expect(stepIndexForProgress(0.5, 2)).toBe(1);
    expect(stepIndexForProgress(0.49, 2)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/marketing/hooks/use-scroll-step.test.ts`
Expected: FAIL — `Cannot find module './use-scroll-step'`.

- [ ] **Step 3: Write the hook**

Create `features/marketing/hooks/use-scroll-step.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function stepIndexForProgress(progress: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}

export function useScrollStep(count: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || count <= 1) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const viewport = window.innerHeight;
      const usable = Math.max(1, el.offsetHeight - viewport);
      const progress = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / usable));
      setIndex(stepIndexForProgress(progress, count));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  const scrollToStep = useCallback(
    (step: number) => {
      const el = ref.current;
      if (!el) return;
      const viewport = window.innerHeight;
      const usable = Math.max(1, el.offsetHeight - viewport);
      const sectionTop = el.getBoundingClientRect().top + window.scrollY;
      const target = sectionTop + (step / count) * usable;
      window.scrollTo({ top: target, behavior: "smooth" });
    },
    [count],
  );

  return { ref, index, scrollToStep };
}
```

> Note: the module is imported by a client component, so `"use client"` is required even though only the hook is exported.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/marketing/hooks/use-scroll-step.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Lint + commit**

Run: `bun lint`
Expected: PASS.

```bash
git add features/marketing/hooks/use-scroll-step.ts features/marketing/hooks/use-scroll-step.test.ts
git commit -m "feat(how-it-works): scroll-progress step hook with unit test"
```

---

## Task 2: Rewrite `how-it-works.tsx` with split scroll-jack layout

**Files:**
- Modify: `features/marketing/components/how-it-works.tsx` (full rewrite)

**Interfaces:**
- Consumes: `useScrollStep` from Task 1 (`{ ref, index, scrollToStep }`), existing `feature-mocks.tsx` exports, `Reveal`, `SectionHeading`.
- Produces: `export function HowItWorks()` (unchanged named export, keeps `#cara-kerja` id).

- [ ] **Step 1: Replace the file**

Replace the entire contents of `features/marketing/components/how-it-works.tsx` with:

```tsx
"use client";

import type { LucideIcon } from "lucide-react";
import { DownloadIcon, PencilIcon, SwatchBookIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollStep } from "../hooks/use-scroll-step";
import {
  AiToolbarMock,
  AtsBadgeMock,
  ColorPresetsMock,
  ExportMock,
  TypographyMock,
} from "./feature-mocks";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
  preview: ReactNode;
};

const STEPS: Step[] = [
  {
    icon: PencilIcon,
    title: "Isi data Anda",
    description:
      "Masukkan pengalaman, pendidikan, dan keahlian. Biarkan AI membantu memoles setiap kalimat.",
    preview: <AiToolbarMock />,
  },
  {
    icon: SwatchBookIcon,
    title: "Pilih template",
    description:
      "Pilih dari lima desain profesional, lalu sesuaikan warna dan tipografi sesuai selera.",
    preview: (
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorPresetsMock />
        <TypographyMock />
      </div>
    ),
  },
  {
    icon: DownloadIcon,
    title: "Unduh & kirim",
    description:
      "Ekspor CV Anda sebagai PDF berkualitas cetak yang ramah ATS, siap dilamar hari ini.",
    preview: (
      <div className="grid gap-4 sm:grid-cols-2">
        <ExportMock />
        <AtsBadgeMock />
      </div>
    ),
  },
];

const PANEL_CLASS =
  "absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none";

function StepCard({
  step,
  number,
  active,
  onClick,
}: {
  step: Step;
  number: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      className={cn(
        "group flex w-full items-start gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all duration-300",
        active
          ? "border-primary/50 shadow-[0_8px_40px_-12px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
          : "border-transparent opacity-60 hover:opacity-100",
      )}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm ring-1 ring-primary/10">
        <step.icon className="size-5" />
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground shadow">
          {number}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-foreground">
          {step.title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {step.description}
        </span>
      </span>
    </button>
  );
}

export function HowItWorks() {
  const { ref, index, scrollToStep } = useScrollStep(STEPS.length);

  const heading = (
    <SectionHeading
      eyebrow="Cara Kerja"
      title="Tiga langkah menuju CV impian"
      description="Tanpa ribet. Dari halaman kosong ke CV siap kirim dalam sekejap."
    />
  );

  return (
    <section
      ref={ref}
      id="cara-kerja"
      className="relative border-y bg-muted/30 lg:h-[300vh]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
      />

      {/* lg+ scroll-jack: sticky stage + advancing steps */}
      <div className="hidden lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Reveal className="pt-20 pb-10">{heading}</Reveal>
          <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-12 pb-20">
            <ol className="space-y-5">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <StepCard
                    step={step}
                    number={i + 1}
                    active={i === index}
                    onClick={() => scrollToStep(i)}
                  />
                </li>
              ))}
            </ol>

            <div
              aria-hidden
              className="relative h-[420px] overflow-hidden rounded-2xl border bg-card p-6 shadow-sm"
            >
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className={cn(
                    PANEL_CLASS,
                    i === index
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-3 opacity-0",
                  )}
                >
                  <div className="flex h-full items-center">
                    {step.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* < lg fallback: stacked steps with previews */}
      <div className="py-20 lg:hidden">
        <div className="mx-auto max-w-xl">
          {heading}
          <div className="mt-10 space-y-10">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <StepCard
                  step={step}
                  number={i + 1}
                  active={i === index}
                  onClick={() => scrollToStep(i)}
                />
                <div className="mt-4 rounded-2xl border bg-card p-6 shadow-sm">
                  {step.preview}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Lint**

Run: `bun lint`
Expected: PASS (no unused imports, no type errors).

- [ ] **Step 3: Verify desktop scroll-jack**

Run: `bun dev`, open `/` at `lg` width (e.g. 1280×800).
Expected:
- `#cara-kerja` scrolls as a 300vh region; the heading + steps + preview pin via `sticky`.
- Scrolling through the region advances the active step: step 1 (Isi data, `AiToolbarMock`) → step 2 (Pilih template, color presets + typography) → step 3 (Unduh & kirim, export + ATS badge).
- Active step card highlights; others dim. Clicking a step smooth-scrolls to its boundary.
- Preview crossfades between steps; no layout jump (stage height fixed).

- [ ] **Step 4: Verify mobile fallback**

Run: `bun dev`, open `/` at mobile width (e.g. 390×844).
Expected: no sticky scroll-jack; each step renders as a card with its preview below it.

- [ ] **Step 5: Commit**

```bash
git add features/marketing/components/how-it-works.tsx
git commit -m "feat(how-it-works): split sticky layout with scroll-advanced steps"
```

---

## Task 3: Final verification

**Files:**
- No changes.

- [ ] **Step 1: Full lint + tests**

Run: `bun lint`
Expected: PASS.

Run: `bun test features/marketing/hooks/use-scroll-step.test.ts`
Expected: PASS.

- [ ] **Step 2: Regression check on neighboring sections**

Run: `bun dev`, open `/`. Scroll through `#cara-kerja`, then confirm the following `#job-tracker` section renders normally (its `Reveal` + board animations unaffected). Confirm reduced-motion (`prefers-reduced-motion: reduce`) still advances steps but without slide animation.

- [ ] **Step 3: Confirm change scope**

Run: `git diff HEAD --stat`
Expected: only `features/marketing/hooks/use-scroll-step.ts`, `features/marketing/hooks/use-scroll-step.test.ts`, `features/marketing/components/how-it-works.tsx` changed across the commits. No editor/template/export feature files touched.
