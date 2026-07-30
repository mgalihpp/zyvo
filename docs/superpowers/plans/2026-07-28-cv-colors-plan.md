# CV Color/Theme Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5-semantic-token color customization to the CV builder with 5 presets, custom color pickers, live draft preview, Terapkan commit, and WCAG AA contrast warnings.

**Architecture:** Colors stored per-CV as a `colors` object inside the existing `CvContent` MongoDB document alongside `typography`. Templates consume colors via 5 CSS custom properties (`--cv-color-*`) set on the preview wrapper. A `draftColors` store field enables preview-only editing before explicit commit.

**Tech Stack:** Zustand (store), Zod (schema), Tailwind `var()` references, native `<input type="color">`, custom `contrast.ts` utility.

## Global Constraints

- All new Zod schemas must use `.default()` so existing stored CVs without `colors` load cleanly (no migration).
- Templates must keep `print:[print-color-adjust:exact]` on colored regions for future PDF export.
- Colors panel must use the existing `"colors"` `BuilderPanel` enum (already wired in sidebar + store).
- All template color changes must replace Tailwind class names with `bg-[var(--cv-color-*)]` / `text-[var(--cv-color-*)]` etc — never use inline `style`.
- Contrast checker warns but never blocks — user can always apply any color.
- Every hex value stored as `#rrggbb` lowercase.

---

### Task 1: Schema, presets, store

**Files:**
- Modify: `features/cv/schemas/cv.ts`
- Create: `features/cv/lib/color-presets.ts`
- Modify: `features/cv/stores/cv-store.ts`

**Interfaces:**
- Consumes: existing `CvContent`, `CvState`, `touch()` in store
- Produces: `colorsSchema`, `CvColors`, `emptyColors`, `COLORS_PRESETS`, `ColorsPresetId`, `PRESETS` (Record), store `colors`/`draftColors` fields + `setColors`, `setDraftColors`, `commitColors`, `resetColors` actions

- [ ] **Step 1: Add colors schema to `features/cv/schemas/cv.ts`**

After the `export const emptyTypography: Typography` block, add:

```ts
export const COLORS_PRESETS = [
  "professional",
  "modern",
  "colorful",
  "dark",
  "neutral",
] as const;
export type ColorsPresetId = (typeof COLORS_PRESETS)[number];

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color")
  .default("#ffffff");

export const colorsSchema = z.object({
  presetId: z.enum(COLORS_PRESETS).or(z.literal("custom")).default("neutral"),
  background: hexColor.default("#ffffff"),
  heading: hexColor.default("#171717"),
  text: hexColor.default("#404040"),
  link: hexColor.default("#525252"),
  accent: hexColor.default("#171717"),
});

export type CvColors = z.infer<typeof colorsSchema>;

export const emptyColors: CvColors = {
  presetId: "neutral",
  background: "#ffffff",
  heading: "#171717",
  text: "#404040",
  link: "#525252",
  accent: "#171717",
};
```

Add `colors: colorsSchema` inside `cvContentSchema`, after the `typography` line:
```ts
colors: colorsSchema.default({
  presetId: "neutral",
  background: "#ffffff",
  heading: "#171717",
  text: "#404040",
  link: "#525252",
  accent: "#171717",
}),
```

Update the exports to include `CvColors` and `emptyColors`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` (or `bun build` — whichever works in this project)
Expected: No errors.

- [ ] **Step 3: Create preset data `features/cv/lib/color-presets.ts`**

```ts
import type { CvColors } from "@/features/cv/schemas/cv";

export const PRESETS: Record<string, CvColors> = {
  professional: {
    presetId: "professional",
    background: "#ffffff",
    heading: "#1e3a5f",
    text: "#333333",
    link: "#1e5a8f",
    accent: "#1e3a5f",
  },
  modern: {
    presetId: "modern",
    background: "#ffffff",
    heading: "#0f172a",
    text: "#334155",
    link: "#2563eb",
    accent: "#2563eb",
  },
  colorful: {
    presetId: "colorful",
    background: "#fffdf7",
    heading: "#7c2d12",
    text: "#3f3f46",
    link: "#c2410c",
    accent: "#ea580c",
  },
  dark: {
    presetId: "dark",
    background: "#1a1a1a",
    heading: "#ffffff",
    text: "#e5e5e5",
    link: "#7dd3fc",
    accent: "#38bdf8",
  },
  neutral: {
    presetId: "neutral",
    background: "#ffffff",
    heading: "#171717",
    text: "#404040",
    link: "#525252",
    accent: "#171717",
  },
};
```

- [ ] **Step 4: Add colors fields + actions to `features/cv/stores/cv-store.ts`**

Import `CvColors` and `emptyColors`:
```ts
import type { CvColors } from "@/features/cv/schemas/cv";
import { emptyColors } from "@/features/cv/schemas/cv";
```

Add to `CvState` interface (after `typography`):
```ts
colors: CvColors;
draftColors: CvColors | null;
```

Add actions to `CvState` interface:
```ts
setColors: (colors: CvColors) => void;
setDraftColors: (colors: CvColors) => void;
commitColors: () => void;
resetColors: () => void;
```

In `emptyContent`, add after `typography`:
```ts
colors: { ...emptyColors },
```

In `CvStoreInit`, optionally add `colors` override to the spread.

In `createCvStore`, add initializer after `typography`:
```ts
...(init?.content?.colors ?? emptyColors),
draftColors: null,
```

Add actions inside `createCvStore`:
```ts
setColors: (colors) => set((s) => ({ colors, ...touch()(s) })),
setDraftColors: (draftColors) => set({ draftColors, saveStatus: "dirty" }),
commitColors: () =>
  set((s) => {
    if (!s.draftColors) return {};
    return {
      colors: s.draftColors,
      draftColors: null,
      ...touch()(s),
    };
  }),
resetColors: () => set({ draftColors: null }),
```

In `getContent`, add `colors: s.colors` to the returned object.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add features/cv/schemas/cv.ts features/cv/lib/color-presets.ts features/cv/stores/cv-store.ts
git commit -m "feat(cv): add colors schema, presets, and store actions"
```

---

### Task 2: Contrast utility + tests

**Files:**
- Create: `features/cv/lib/contrast.ts`
- Create: `features/cv/lib/__tests__/contrast.test.ts`

**Interfaces:**
- Consumes: hex color strings
- Produces: `hexToRgb`, `relativeLuminance`, `contrastRatio`, `passesAA`, `passesAALarge`, `readableOn`

- [ ] **Step 1: Write failing tests**

Create `features/cv/lib/__tests__/contrast.test.ts`:

```ts
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  passesAA,
  passesAALarge,
  readableOn,
} from "@/features/cv/lib/contrast";
import { PRESETS } from "@/features/cv/lib/color-presets";

describe("hexToRgb", () => {
  it("converts black", () => {
    assert.deepEqual(hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
  });
  it("converts white", () => {
    assert.deepEqual(hexToRgb("#ffffff"), { r: 255, g: 255, b: 255 });
  });
  it("converts a middle color", () => {
    assert.deepEqual(hexToRgb("#1e3a5f"), { r: 30, g: 58, b: 95 });
  });
});

describe("contrastRatio", () => {
  it("black on white = 21", () => {
    assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1);
  });
  it("white on black = 21", () => {
    assert.ok(Math.abs(contrastRatio("#ffffff", "#000000") - 21) < 1);
  });
  it("same color = 1", () => {
    assert.equal(contrastRatio("#ff0000", "#ff0000"), 1);
  });
});

describe("passesAA", () => {
  it("black on white passes", () => {
    assert.equal(passesAA("#000000", "#ffffff"), true);
  });
  it("light gray on white fails", () => {
    assert.equal(passesAA("#cccccc", "#ffffff"), false);
  });
});

describe("passesAALarge", () => {
  it("black on white passes", () => {
    assert.equal(passesAALarge("#000000", "#ffffff"), true);
  });
  it("moderate gray on white fails", () => {
    assert.equal(passesAALarge("#aaaaaa", "#ffffff"), false);
  });
});

describe("readableOn", () => {
  it("returns white on dark bg", () => {
    assert.equal(readableOn("#000000"), "#ffffff");
  });
  it("returns black on light bg", () => {
    assert.equal(readableOn("#ffffff"), "#000000");
  });
});

describe("all presets pass AA", () => {
  for (const [id, p] of Object.entries(PRESETS)) {
    it(`${id}: text/background passes AA`, () => {
      assert.equal(passesAA(p.text, p.background), true);
    });
    it(`${id}: heading/background passes AA`, () => {
      assert.equal(passesAA(p.heading, p.background), true);
    });
    it(`${id}: link/background passes AA`, () => {
      assert.equal(passesAA(p.link, p.background), true);
    });
  }
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `tsx --test "features/cv/lib/__tests__/contrast.test.ts"`
Expected: FAIL — all tests fail with "module not found" or similar.

- [ ] **Step 3: Write the implementation**

Create `features/cv/lib/contrast.ts`:

```ts
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  return (
    0.2126 * srgbChannel(rgb.r) +
    0.7152 * srgbChannel(rgb.g) +
    0.0722 * srgbChannel(rgb.b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(hexToRgb(a));
  const lumB = relativeLuminance(hexToRgb(b));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function passesAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5;
}

export function passesAALarge(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 3.0;
}

export function readableOn(bg: string): string {
  const lum = relativeLuminance(hexToRgb(bg));
  return lum > 0.179 ? "#000000" : "#ffffff";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `tsx --test "features/cv/lib/__tests__/contrast.test.ts"`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/cv/lib/contrast.ts features/cv/lib/__tests__/contrast.test.ts
git commit -m "feat(cv): add contrast utility with WCAG AA checks"
```

---

### Task 3: CvPreview — read colors, set CSS vars

**Files:**
- Modify: `features/cv/components/cv-preview.tsx`

**Interfaces:**
- Consumes: `CvState.colors`, `CvState.draftColors`, `CvState.activePanel` from store
- Produces: 5 `--cv-color-*` CSS custom properties on the preview wrapper `<div>`

- [ ] **Step 1: Update `features/cv/components/cv-preview.tsx`**

Add these selectors after existing `useCvStore` calls:
```ts
const colors = useCvStore((s) => s.colors);
const draftColors = useCvStore((s) => s.draftColors);
const activePanel = useCvStore((s) => s.activePanel);
```

Compute effective colors:
```ts
const effectiveColors = activePanel === "colors" && draftColors ? draftColors : colors;
```

Add to the `content` object (after `typography`):
```ts
colors: effectiveColors,
```

Add 5 CSS vars to the inline `style` object (after `letterSpacing`):
```ts
"--cv-color-bg": effectiveColors.background,
"--cv-color-heading": effectiveColors.heading,
"--cv-color-text": effectiveColors.text,
"--cv-color-link": effectiveColors.link,
"--cv-color-accent": effectiveColors.accent,
```

Also add `colors` to the `CvContent` type assertion if needed — the `content` object is typed as `CvContent`, but CvContent doesn't include `colors` yet. We don't actually need to pass colors as a prop to templates (they read CSS vars), but we need to make sure TypeScript is happy. Let's just add it to the spread — `CvContent` will have `colors` after Task 1, so this should compile.

Actually, looking at the existing code again: `CvContent` already has `colors` after Task 1 adds it to `cvContentSchema`. The `content` variable is typed as `CvContent`. So `effectiveColors` should be assigned to the spread. But templates don't receive `colors` as a prop — they just read CSS vars from the DOM. So we don't need to pass it via `CvContent`. But we do need it in the content object for type completeness since CvContent now includes `colors`. Let me add it.

Add to the `content` object:
```ts
colors: effectiveColors,
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add features/cv/components/cv-preview.tsx
git commit -m "feat(cv): wire color CSS vars into CV preview"
```

---

### Task 4: Template refactor — classic + minimal

**Files:**
- Modify: `features/cv/components/templates/classic.tsx`
- Modify: `features/cv/components/templates/minimal.tsx`

**Interfaces:**
- Consumes: `--cv-color-bg`, `--cv-color-heading`, `--cv-color-text`, `--cv-color-link`, `--cv-color-accent` CSS vars (set by CvPreview)
- No runtime imports needed

- [ ] **Step 1: Refactor `classic.tsx`**

Replace every hardcoded Tailwind color class:

| Find | Replace |
|---|---|
| `bg-white` | `bg-[var(--cv-color-bg)]` |
| `text-neutral-900` (h1, h3 headings, `.font-semibold.text-neutral-900`) | `text-[var(--cv-color-heading)]` |
| `text-neutral-800` (body, article) | `text-[var(--cv-color-text)]` |
| `text-neutral-700` (description, skill text) | `text-[var(--cv-color-text)]` |
| `text-neutral-600` (contact, link, metadata) | keep as `text-[var(--cv-color-text)]` — opacity doesn't work well with arbitrary CSS vars |
| `text-neutral-500` (section headings, dates) | `text-[var(--cv-color-text)]` |
| `border-neutral-300` | `border-[var(--cv-color-accent)]` (the section divider under header) |

The section header text (currently `text-neutral-500`) would look better as the accent color for section headings. Let's make section `h2` use accent: `text-[var(--cv-color-accent)]`.

For dates/metadata that should be de-emphasized, use `text-[var(--cv-color-text)]/70` where Tailwind opacity modifier works with CSS vars (Tailwind v4 supports this). Actually, in Tailwind v4 arbitrary values, opacity modifiers via `/` may not work with `var()`. Safer to use `opacity-70` class alongside `text-[var(--cv-color-text)]`.

So the pattern for muted text: `className="text-[var(--cv-color-text)] opacity-70"`.

Apply this specifically to:
- Contact/header metadata line
- Date ranges
- Location text
- Section heading (accent color instead)
- URL/link text → `text-[var(--cv-color-link)]`

- [ ] **Step 2: Refactor `minimal.tsx`**

Same pattern:

| Find | Replace |
|---|---|
| `bg-white` | `bg-[var(--cv-color-bg)]` |
| `text-neutral-900` (heading, name, item titles) | `text-[var(--cv-color-heading)]` |
| `text-neutral-700` (body) | `text-[var(--cv-color-text)]` |
| `text-neutral-500` (metadata, headline) | `text-[var(--cv-color-text)] opacity-70` |
| `text-neutral-400` (dates, section headings) | `text-[var(--cv-color-text)] opacity-70` |
| `border-neutral-300` (section top border) | `border-[var(--cv-color-accent)]` |
| `font-light` on article | keep (structural, not color) |
| `.font-medium.text-neutral-900` (cert name) | `text-[var(--cv-color-heading)]` |

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add features/cv/components/templates/classic.tsx features/cv/components/templates/minimal.tsx
git commit -m "feat(cv): refactor classic + minimal templates to use color CSS vars"
```

---

### Task 5: Template refactor — professional + fresh-graduate

**Files:**
- Modify: `features/cv/components/templates/professional.tsx`
- Modify: `features/cv/components/templates/fresh-graduate.tsx`

**Interfaces:**
- Consumes: CSS vars from Task 3, `readableOn` logic (used by the panel, not templates — templates just use CSS vars)

- [ ] **Step 1: Refactor `professional.tsx`**

This template has a colored header band (bg-sky-800) with white text, and skill chips (bg-sky-50 / text-sky-800):

| Find | Replace |
|---|---|
| `bg-white` (article bg) | `bg-[var(--cv-color-bg)]` |
| `bg-sky-800` (header band) | `bg-[var(--cv-color-accent)]` |
| white text in header (name, contact) | `text-[var(--cv-color-text)]` won't work here — header text is on accent bg. Use a separate CSS variable for on-accent text. But per spec, we only have 5 tokens. Instead, templates should not render text directly on accent without ensuring readability. But we need a color for text-on-accent...

Actually, this exposes a gap. The `professional` template renders white text on a colored header. The spec says "templates map the 5 tokens." For accent regions, the template should derive text color from the accent background. Options:

1. Use `contrast.ts`'s `readableOn()` — but templates are server components? No, they're imported dynamically and rendered client-side. However, they don't have access to the contrast utility.

2. Use a CSS approach: `color: white` is wrong if the accent is light. We could use a CSS `color-mix` or similar, but browser support varies.

3. Let the templates handle this via CSS: add another CSS var `--cv-color-on-accent` that's computed by the CvPreview. Since we already know the accent color there, we can compute the readable text color and set it as a derived CSS var.

The cleanest approach: in `CvPreview`, compute a derived `--cv-color-on-accent` using the `readableOn` utility:
```ts
import { readableOn } from "@/features/cv/lib/contrast";
// In the style:
"--cv-color-on-accent": readableOn(effectiveColors.accent),
```

This doesn't add a store field — it's derived at render time. Add this to both CvPreview AND use it in professional/fresh-graduate/modern templates.

Let me update this task to add the `--cv-color-on-accent` var.

Similarly for skill chips (bg-sky-50 in professional, bg-emerald-50 in fresh-graduate) — these are tinted versions of the accent color. We can derive a "soft" variant. Let's add:
- `--cv-color-accent-soft`: the accent at ~15% opacity. In CSS: `color-mix(in srgb, var(--cv-color-accent) 15%, transparent)` — but `color-mix` with transparent might not work in all browsers. Simpler: the template just uses `bg-[var(--cv-color-accent)] opacity-15`.

Actually, `opacity-15` on a background won't work well because it applies to the entire element including children. We need `background-color` opacity specifically. Use `bg-[var(--cv-color-accent)]/15` — in Tailwind v4, `bg-[var(--x)]/15` should work for setting background color with opacity via `color-mix`.

Wait, in Tailwind v4, arbitrary values with opacity modifier use the `color-mix` CSS function under the hood when the value is a CSS variable. So `bg-[var(--cv-color-accent)]/15` should work in modern browsers.

Let me check — in Tailwind v4 docs, `bg-[var(--my-color)]/50` produces `background-color: color-mix(in srgb, var(--my-color) 50%, transparent)`. Yes, this works.

So for chips: `bg-[var(--cv-color-accent)]/15 text-[var(--cv-color-accent)]`.

Now back to the professional header. The white text on accent: header currently has `<header className="bg-sky-800 px-10 py-8 text-white ...">`. Replace with:
```
<header className="bg-[var(--cv-color-accent)] px-10 py-8 text-[var(--cv-color-on-accent)] ...">
```

And add `--cv-color-on-accent` to CvPreview's style object.

Let me add a sub-step to update CvPreview first.

- [ ] **Step 1a (prerequisite): Add derived `--cv-color-on-accent` to CvPreview**

In `cv-preview.tsx`, import `readableOn` from contrast utility and add:
```ts
"--cv-color-on-accent": readableOn(effectiveColors.accent),
```

Add this alongside the 5 main vars in the style object.

- [ ] **Step 1b: Refactor `professional.tsx`**

Specific changes:
- Article bg: `bg-white` → `bg-[var(--cv-color-bg)]`
- Header bg: `bg-sky-800` → `bg-[var(--cv-color-accent)]`
- Header text: `text-white` → `text-[var(--cv-color-on-accent)]`
- Name in header: keep `font-bold`, remove `text-white` (now from parent)
- Section headings (h2): `text-neutral-500` → `text-[var(--cv-color-accent)]`
- Body text (`text-neutral-700`, `text-neutral-800`): → `text-[var(--cv-color-text)]`
- Metadata (`text-neutral-600`, `text-neutral-500`): → `text-[var(--cv-color-text)] opacity-70`
- Skill chips: `bg-sky-50 text-sky-800` → `bg-[var(--cv-color-accent)]/15 text-[var(--cv-color-accent)]`
- Bottom divider: keep the hr if present

- [ ] **Step 2: Refactor `fresh-graduate.tsx`**

- Article bg: `bg-white` → `bg-[var(--cv-color-bg)]`
- Header border: `border-emerald-600` → `border-[var(--cv-color-accent)]`
- Headline: `text-emerald-700` → `text-[var(--cv-color-accent)]`
- Section h2: `text-emerald-700` → `text-[var(--cv-color-accent)]`
- All `text-neutral-900` (heading text) → `text-[var(--cv-color-heading)]`
- All `text-neutral-800` → `text-[var(--cv-color-text)]`
- All `text-neutral-700` (body) → `text-[var(--cv-color-text)]`
- All `text-neutral-600`, `text-neutral-500` (metadata) → `text-[var(--cv-color-text)] opacity-70`
- Skill chips: `bg-emerald-50 text-emerald-800` → `bg-[var(--cv-color-accent)]/15 text-[var(--cv-color-accent)]`

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add features/cv/components/cv-preview.tsx features/cv/components/templates/professional.tsx features/cv/components/templates/fresh-graduate.tsx
git commit -m "feat(cv): refactor professional + fresh-graduate templates; add on-accent derived CSS var"
```

---

### Task 6: Template refactor — modern

**Files:**
- Modify: `features/cv/components/templates/modern.tsx`

**Interfaces:**
- Consumes: `--cv-color-bg`, `--cv-color-heading`, `--cv-color-text`, `--cv-color-link`, `--cv-color-accent`, `--cv-color-on-accent` CSS vars

- [ ] **Step 1: Refactor `modern.tsx`**

This template has a dark sidebar (`bg-neutral-900 text-neutral-200`) and a white main area.

Sidebar mappings:
- `bg-neutral-900` → `bg-[var(--cv-color-accent)]`
- `text-neutral-200` → `text-[var(--cv-color-on-accent)]`
- `text-neutral-400` (sidebar metadata) → `text-[var(--cv-color-on-accent)] opacity-70`
- `border-b border-neutral-700` → `border-[var(--cv-color-on-accent)] opacity-20`
- Section heading in sidebar (`text-neutral-400`) → `text-[var(--cv-color-on-accent)] opacity-70`

Main area mappings:
- `bg-white` → `bg-[var(--cv-color-bg)]`
- `text-neutral-900` (name, h3) → `text-[var(--cv-color-heading)]`
- `text-neutral-800` → `text-[var(--cv-color-text)]`
- `text-neutral-700` (body) → `text-[var(--cv-color-text)]`
- `text-neutral-600`, `text-neutral-500` (meta, dates) → `text-[var(--cv-color-text)] opacity-70`
- Section heading in main (`text-neutral-500`) → `text-[var(--cv-color-accent)]`

Read the current `modern.tsx` to see exact classes used:
```tsx
<aside className="bg-neutral-900 p-6 text-neutral-200 print:bg-neutral-900 print:[print-color-adjust:exact]">
```

```tsx
<article className="mx-auto w-full max-w-[794px] bg-white p-10 text-neutral-800 shadow-sm">
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add features/cv/components/templates/modern.tsx
git commit -m "feat(cv): refactor modern template to use color CSS vars"
```

---

### Task 7: Colors panel component

**Files:**
- Create: `features/cv/components/panels/colors-panel.tsx`

**Interfaces:**
- Consumes: `CvState.colors`, `CvState.draftColors`, `CvState.activePanel`, `setDraftColors`, `commitColors`, `resetColors` from store; `PRESETS` from lib; `contrastRatio`, `passesAA` from contrast util
- Produces: `<ColorsPanel />` React component

- [ ] **Step 1: Create `features/cv/components/panels/colors-panel.tsx`**

```tsx
"use client";

import { useCallback, useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { contrastRatio, passesAA } from "@/features/cv/lib/contrast";
import { PRESETS } from "@/features/cv/lib/color-presets";
import type { CvColors } from "@/features/cv/schemas/cv";
import { emptyColors } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

const COLOR_LABELS: Record<keyof CvColors, string> = {
  presetId: "Preset",
  background: "Latar Belakang",
  heading: "Judul",
  text: "Teks Utama",
  link: "Tautan",
  accent: "Aksen",
};

const CONTRAST_PAIRS: { fg: keyof CvColors; bg: keyof CvColors; label: string }[] = [
  { fg: "heading", bg: "background", label: "Judul : Latar" },
  { fg: "text", bg: "background", label: "Teks : Latar" },
  { fg: "link", bg: "background", label: "Tautan : Latar" },
];

function deepEqual(a: CvColors, b: CvColors) {
  return (
    a.background === b.background &&
    a.heading === b.heading &&
    a.text === b.text &&
    a.link === b.link &&
    a.accent === b.accent
  );
}

export function ColorsPanel() {
  const storeColors = useCvStore((s) => s.colors);
  const draftColors = useCvStore((s) => s.draftColors);
  const setDraftColors = useCvStore((s) => s.setDraftColors);
  const commitColors = useCvStore((s) => s.commitColors);
  const resetColors = useCvStore((s) => s.resetColors);

  const [tab, setTab] = useState<"presets" | "custom">("presets");

  // Use draft if available, otherwise committed
  const current = draftColors ?? storeColors;

  const handlePreset = useCallback(
    (preset: CvColors) => {
      setDraftColors(preset);
    },
    [setDraftColors],
  );

  const handleColorChange = useCallback(
    (key: keyof CvColors, value: string) => {
      setDraftColors({ ...current, presetId: "custom", [key]: value });
    },
    [current, setDraftColors],
  );

  const hasChanges = !deepEqual(current, storeColors);
  const hasDraft = draftColors !== null;

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Warna</h2>
        <p className="text-xs text-muted-foreground">
          Atur warna tema CV Anda.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "presets" | "custom")}
      >
        <div className="border-b px-4 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="presets" className="flex-1">
              Tema Preset
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">
              Kustom
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="presets" className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.values(PRESETS).map((preset) => {
              const isActive = deepEqual(current, preset);
              return (
                <button
                  key={preset.presetId}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`overflow-hidden rounded-lg border text-left transition-colors ${
                    isActive
                      ? "border-ring ring-1 ring-ring"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex gap-1 p-3">
                    <div
                      className="size-5 rounded"
                      style={{ backgroundColor: preset.accent }}
                    />
                    <div
                      className="size-5 rounded"
                      style={{ backgroundColor: preset.heading }}
                    />
                    <div
                      className="size-5 rounded"
                      style={{ backgroundColor: preset.text }}
                    />
                    <div
                      className="size-5 rounded"
                      style={{ backgroundColor: preset.link }}
                    />
                  </div>
                  <div className="border-t border-border px-3 py-2 text-sm font-medium capitalize">
                    {
                      {
                        professional: "Profesional",
                        modern: "Modern",
                        colorful: "Berwarna",
                        dark: "Gelap",
                        neutral: "Netral",
                      }[preset.presetId]
                    }
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 p-4">
          {(Object.keys(COLOR_LABELS) as Array<keyof CvColors>)
            .filter((key) => key !== "presetId")
            .map((key) => (
              <div key={key} className="space-y-1.5">
                <Label>{COLOR_LABELS[key]}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={current[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="size-9 cursor-pointer rounded-md border border-input p-0.5"
                  />
                  <input
                    type="text"
                    value={current[key]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                        handleColorChange(key, val);
                      }
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  />
                </div>
              </div>
            ))}
        </TabsContent>
      </Tabs>

      {/* Contrast warnings */}
      <div className="border-t px-4 py-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Kontras Warna
        </p>
        <div className="space-y-1.5">
          {CONTRAST_PAIRS.map((pair) => {
            const ratio = contrastRatio(
              current[pair.fg],
              current[pair.bg],
            );
            const ok = passesAA(current[pair.fg], current[pair.bg]);
            return (
              <div
                key={pair.label}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded"
                    style={{ backgroundColor: current[pair.bg] }}
                  />
                  <span
                    className="inline-block size-3 rounded"
                    style={{ backgroundColor: current[pair.fg] }}
                  />
                  <span className="text-muted-foreground">
                    {pair.label}
                  </span>
                </div>
                <span
                  className={
                    ok ? "text-green-600" : "text-amber-600"
                  }
                >
                  {ratio.toFixed(1)}:1 {ok ? "✓" : "⚠ Rendah"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t p-4">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={!hasChanges}
          onClick={() => {
            if (hasDraft) commitColors();
          }}
        >
          Terapkan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setDraftColors(emptyColors);
          }}
        >
          <RotateCcwIcon className="size-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add features/cv/components/panels/colors-panel.tsx
git commit -m "feat(cv): add colors panel with presets, custom pickers, and contrast warnings"
```

---

### Task 8: Wire colors panel into index.tsx

**Files:**
- Modify: `features/cv/components/panels/index.tsx`

**Interfaces:**
- Consumes: `ColorsPanel` component from Task 7
- Replaces the existing `Placeholder` for `"colors"` case

- [ ] **Step 1: Add lazy import + skeleton**

In `index.tsx`, after the `TypographyPanel` lazy import, add:
```tsx
const ColorsPanel = lazy(() =>
  import("./colors-panel").then((m) => ({ default: m.ColorsPanel })),
);
```

Add a `ColorsSkeleton` function (after `TypographySkeleton`):
```tsx
function ColorsSkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {["a", "b", "c", "d"].map((k) => (
            <div key={k} className="overflow-hidden rounded-lg border">
              <div className="flex gap-1 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="size-5 rounded" />
                ))}
              </div>
              <div className="border-t p-2.5">
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Replace the `"colors"` case in `ActivePanel`:
```tsx
case "colors":
  return (
    <Suspense fallback={<ColorsSkeleton />}>
      <ColorsPanel />
    </Suspense>
  );
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add features/cv/components/panels/index.tsx
git commit -m "feat(cv): wire colors panel into builder sidebar"
```

---

### Task 9: Self-review & final verification

**Files:** All files from Tasks 1-8

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run lint**

Run: `bun lint` (Biome check)
Expected: No errors.

- [ ] **Step 3: Run contrast tests**

Run: `tsx --test "features/cv/lib/__tests__/contrast.test.ts"`
Expected: PASS.

- [ ] **Step 4: Run all tests**

Run: `tsx --test "features/cv/lib/__tests__/*.test.ts"`
Expected: All tests pass.

- [ ] **Step 5: Final commit (if any fixes were needed)**

If everything passes and there are no uncommitted files:
```bash
git status
```

If clean, this is just a verification pass — no commit needed.
