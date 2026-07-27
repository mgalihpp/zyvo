# Typography Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working Typography panel to the CV builder letting users pick heading/body fonts and adjust size scale, line height, and letter spacing, persisted per-CV and rendered live across all 5 templates.

**Architecture:** Typography is an embedded object on `cvContent` (Zod), so it flows through the existing tRPC `cv.update` + 800ms debounced autosave with no new backend. The preview wrapper injects CSS variables (`--cv-font-heading`, `--cv-font-body`, plus `font-size`/`line-height`/`letter-spacing`); templates read them. Absolute Tailwind type sizes are converted to `em` so the scale multiplier works.

**Tech Stack:** Next.js 16 (App Router), React 19, Zod, Zustand, `next/font/google`, Tailwind v4, shadcn/ui (Select, Slider, Label, Button).

## Global Constraints

- Package manager: `bun` (run `bun lint` for Biome check).
- No new dependencies — all fonts via built-in `next/font/google`, all UI via existing shadcn components in `components/ui/`.
- `@/*` path alias maps to project root.
- Zod `cvContentSchema` is the single source of truth (tRPC input + react-hook-form + store). Any new content field must be added to: `cvContentSchema`, store `CvState`, store `emptyContent`, store `getContent()`.
- Every store content mutator calls `touch()` to bump `revision` (triggers autosave).
- Panel copy is Indonesian (match existing panels).
- Font ids (verbatim): `geist`, `inter`, `roboto`, `lato`, `merriweather`, `lora`, `source-serif`, `jetbrains-mono`.
- Do NOT change template color logic (that belongs to the separate colors panel).

---

### Task 1: Typography schema + font registry

**Files:**
- Modify: `features/cv/schemas/cv.ts` (add schema near L86, add exports near L114/L177)
- Create: `features/cv/lib/fonts.ts`
- Test: `features/cv/lib/__tests__/typography.test.ts`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces:
  - `FONT_IDS: readonly FontId[]` and `type FontId` in `schemas/cv.ts`
  - `typographySchema` (Zod), `type Typography = z.infer<typeof typographySchema>`, `emptyTypography: Typography` in `schemas/cv.ts`
  - `typography` field added to `cvContentSchema`
  - `FONT_REGISTRY: Record<FontId, { label: string; category: "sans" | "serif" | "mono"; cssVar: string }>` and `FONTS_BY_CATEGORY` in `features/cv/lib/fonts.ts`

- [ ] **Step 1: Write the failing test**

Create `features/cv/lib/__tests__/typography.test.ts`:

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cvContentSchema,
  emptyTypography,
  FONT_IDS,
  typographySchema,
} from "@/features/cv/schemas/cv";
import { FONT_REGISTRY } from "@/features/cv/lib/fonts";

test("emptyTypography parses and matches defaults", () => {
  const parsed = typographySchema.parse(emptyTypography);
  assert.deepEqual(parsed, emptyTypography);
  assert.equal(parsed.fontHeading, "geist");
  assert.equal(parsed.fontBody, "geist");
  assert.equal(parsed.scale, 1);
  assert.equal(parsed.lineHeight, 1.5);
  assert.equal(parsed.letterSpacing, 0);
});

test("typography defaults applied on empty object", () => {
  const parsed = typographySchema.parse({});
  assert.deepEqual(parsed, emptyTypography);
});

test("scale is clamped by range", () => {
  assert.throws(() => typographySchema.parse({ scale: 2 }));
  assert.throws(() => typographySchema.parse({ scale: 0.5 }));
});

test("cvContent gets typography defaults when omitted", () => {
  const cv = cvContentSchema.parse({ title: "X" });
  assert.deepEqual(cv.typography, emptyTypography);
});

test("every FONT_ID has a registry entry with a matching cssVar", () => {
  for (const id of FONT_IDS) {
    const entry = FONT_REGISTRY[id];
    assert.ok(entry, `missing registry entry for ${id}`);
    assert.equal(entry.cssVar, `--font-${id}`);
    assert.ok(["sans", "serif", "mono"].includes(entry.category));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/cv/lib/__tests__/typography.test.ts`
Expected: FAIL (exports `typographySchema`, `emptyTypography`, `FONT_IDS`, `FONT_REGISTRY` not defined).

- [ ] **Step 3: Add schema + font ids to `features/cv/schemas/cv.ts`**

Insert after `customSchema` (L85), before `cvContentSchema`:

```ts
export const FONT_IDS = [
  "geist",
  "inter",
  "roboto",
  "lato",
  "merriweather",
  "lora",
  "source-serif",
  "jetbrains-mono",
] as const;

export type FontId = (typeof FONT_IDS)[number];

export const typographySchema = z.object({
  fontHeading: z.enum(FONT_IDS).default("geist"),
  fontBody: z.enum(FONT_IDS).default("geist"),
  scale: z.number().min(0.85).max(1.15).default(1),
  lineHeight: z.number().min(1.2).max(1.8).default(1.5),
  letterSpacing: z.number().min(-0.02).max(0.05).default(0),
});
```

Add the field to `cvContentSchema` (after `templateId`, L89):

```ts
  typography: typographySchema.default({
    fontHeading: "geist",
    fontBody: "geist",
    scale: 1,
    lineHeight: 1.5,
    letterSpacing: 0,
  }),
```

Add type export near the other `z.infer` exports (after L115):

```ts
export type Typography = z.infer<typeof typographySchema>;
```

Add the empty default near the other `empty*` constants (after L177):

```ts
export const emptyTypography: Typography = {
  fontHeading: "geist",
  fontBody: "geist",
  scale: 1,
  lineHeight: 1.5,
  letterSpacing: 0,
};
```

- [ ] **Step 4: Create `features/cv/lib/fonts.ts`**

```ts
import type { FontId } from "@/features/cv/schemas/cv";
import { FONT_IDS } from "@/features/cv/schemas/cv";

export type FontCategory = "sans" | "serif" | "mono";

export interface FontMeta {
  label: string;
  category: FontCategory;
  cssVar: string;
}

/** Display metadata + CSS var (set in app/layout.tsx) for each preset font. */
export const FONT_REGISTRY: Record<FontId, FontMeta> = {
  geist: { label: "Geist", category: "sans", cssVar: "--font-geist" },
  inter: { label: "Inter", category: "sans", cssVar: "--font-inter" },
  roboto: { label: "Roboto", category: "sans", cssVar: "--font-roboto" },
  lato: { label: "Lato", category: "sans", cssVar: "--font-lato" },
  merriweather: {
    label: "Merriweather",
    category: "serif",
    cssVar: "--font-merriweather",
  },
  lora: { label: "Lora", category: "serif", cssVar: "--font-lora" },
  "source-serif": {
    label: "Source Serif",
    category: "serif",
    cssVar: "--font-source-serif",
  },
  "jetbrains-mono": {
    label: "JetBrains Mono",
    category: "mono",
    cssVar: "--font-jetbrains-mono",
  },
};

export const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  mono: "Monospace",
};

/** Font ids grouped by category, in category order, for the panel selects. */
export const FONTS_BY_CATEGORY: { category: FontCategory; ids: FontId[] }[] = (
  ["sans", "serif", "mono"] as FontCategory[]
).map((category) => ({
  category,
  ids: FONT_IDS.filter((id) => FONT_REGISTRY[id].category === category),
}));
```

Note: `--font-geist` here differs from the existing root var `--font-geist-sans` in `app/layout.tsx`. Task 2 adds a `--font-geist` alias so the registry resolves.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test features/cv/lib/__tests__/typography.test.ts`
Expected: PASS (all 5 tests).

- [ ] **Step 6: Commit**

```bash
git add features/cv/schemas/cv.ts features/cv/lib/fonts.ts features/cv/lib/__tests__/typography.test.ts
git commit -m "feat(cv): typography schema + font registry"
```

---

### Task 2: Load preset fonts in root layout

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `FONT_REGISTRY` cssVar names from Task 1 (`--font-inter`, `--font-roboto`, ... and `--font-geist`).
- Produces: CSS variables `--font-<id>` available globally on `<html>` for every font id in `FONT_IDS`.

- [ ] **Step 1: Add font imports**

In `app/layout.tsx`, replace the single import line (L3) with all preset fonts:

```ts
import {
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Lato,
  Lora,
  Merriweather,
  Roboto,
  Source_Serif_4,
} from "next/font/google";
```

- [ ] **Step 2: Instantiate the new fonts**

After the existing `geistSans` / `geistMono` declarations (L7-15), add. Fonts with no default weight (Roboto, Lato, Merriweather) require explicit `weight`:

```ts
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap" });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});
```

- [ ] **Step 3: Add all variables to `<html>` className**

Replace the `className` on `<html>` (L33). The existing `geistSans.variable` maps to `--font-geist-sans`; add a `--font-geist` alias via an inline style so the registry's `--font-geist` resolves:

```tsx
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${roboto.variable} ${lato.variable} ${merriweather.variable} ${lora.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={{ ["--font-geist" as string]: "var(--font-geist-sans)" }}
    >
```

- [ ] **Step 4: Verify build compiles**

Run: `bun lint`
Expected: PASS (no unused imports, no errors). Then manually confirm `bun dev` boots without font errors (optional).

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(cv): load preset typography fonts in root layout"
```

---

### Task 3: Store typography state + mutator

**Files:**
- Modify: `features/cv/stores/cv-store.ts`
- Test: `features/cv/stores/__tests__/typography-store.test.ts`

**Interfaces:**
- Consumes: `Typography`, `emptyTypography` from Task 1.
- Produces: `setTypography(patch: Partial<Typography>) => void` on the store; `typography` present in `CvState`, `emptyContent`, and `getContent()` output.

- [ ] **Step 1: Write the failing test**

Create `features/cv/stores/__tests__/typography-store.test.ts`:

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { emptyTypography } from "@/features/cv/schemas/cv";
import { createCvStore } from "@/features/cv/stores/cv-store";

test("store seeds typography default and setTypography merges + touches", () => {
  const store = createCvStore();
  assert.deepEqual(store.getState().typography, emptyTypography);

  const before = store.getState().revision;
  store.getState().setTypography({ fontHeading: "lora", scale: 1.1 });
  const s = store.getState();

  assert.equal(s.typography.fontHeading, "lora");
  assert.equal(s.typography.scale, 1.1);
  assert.equal(s.typography.fontBody, "geist");
  assert.equal(s.revision, before + 1);
  assert.equal(s.saveStatus, "dirty");
});

test("getContent includes typography", () => {
  const store = createCvStore();
  store.getState().setTypography({ letterSpacing: 0.02 });
  assert.equal(store.getState().getContent().typography.letterSpacing, 0.02);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/cv/stores/__tests__/typography-store.test.ts`
Expected: FAIL (`typography` undefined / `setTypography` not a function).

- [ ] **Step 3: Add imports**

In `cv-store.ts`, add `Typography` to the type import block (L2-14):

```ts
  type Typography,
```

and add `emptyTypography` to the value import block (L15-26):

```ts
  emptyTypography,
```

- [ ] **Step 4: Add to `CvState` interface**

After `setSummary` (L97), add:

```ts
  setTypography: (patch: Partial<Typography>) => void;
```

- [ ] **Step 5: Add to `emptyContent`**

In `emptyContent` (L158-172), after `templateId: "classic",` add:

```ts
  typography: { ...emptyTypography },
```

- [ ] **Step 6: Add the mutator**

After `setSummary` implementation (L233), add:

```ts
    setTypography: (patch) =>
      set((s) => ({
        typography: { ...s.typography, ...patch },
        ...touch()(s),
      })),
```

- [ ] **Step 7: Add to `getContent()`**

In the returned object (L453-467), after `templateId: s.templateId,` add:

```ts
        typography: s.typography,
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun test features/cv/stores/__tests__/typography-store.test.ts`
Expected: PASS (both tests).

- [ ] **Step 9: Commit**

```bash
git add features/cv/stores/cv-store.ts features/cv/stores/__tests__/typography-store.test.ts
git commit -m "feat(cv): typography store state + setTypography mutator"
```

---

### Task 4: Apply typography via CSS vars in preview wrapper

**Files:**
- Modify: `features/cv/components/cv-preview.tsx`

**Interfaces:**
- Consumes: store `typography`; `FONT_REGISTRY` from Task 1.
- Produces: a wrapper `<div>` around `<Template>` exposing `--cv-font-heading`, `--cv-font-body` and setting `fontSize`/`lineHeight`/`letterSpacing`/`fontFamily`. Templates (Task 5) rely on these vars.

- [ ] **Step 1: Add store selector + registry import**

In `cv-preview.tsx`, add import at top:

```ts
import { FONT_REGISTRY } from "@/features/cv/lib/fonts";
```

Add a selector alongside the others (after L21):

```ts
  const typography = useCvStore((s) => s.typography);
```

Add `typography` to the `content` object (after `templateId,` L36):

```ts
    typography,
```

- [ ] **Step 2: Build the style object and wrap the template**

Replace the `Suspense`/`Template` block (L54-56) with a styled wrapper. Base font size is 13px (matches the current template body size):

```tsx
      <Suspense fallback={<PreviewSkeleton />}>
        <div
          style={
            {
              "--cv-font-heading": `var(${FONT_REGISTRY[typography.fontHeading].cssVar})`,
              "--cv-font-body": `var(${FONT_REGISTRY[typography.fontBody].cssVar})`,
              fontFamily: "var(--cv-font-body)",
              fontSize: `${13 * typography.scale}px`,
              lineHeight: typography.lineHeight,
              letterSpacing: `${typography.letterSpacing}em`,
            } as React.CSSProperties
          }
        >
          <Template cv={content} />
        </div>
      </Suspense>
```

- [ ] **Step 3: Verify lint + type check**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add features/cv/components/cv-preview.tsx
git commit -m "feat(cv): inject typography css vars in preview wrapper"
```

---

### Task 5: Convert templates to em sizing + heading font var

**Files:**
- Modify: `features/cv/components/templates/classic.tsx`
- Modify: `features/cv/components/templates/modern.tsx`
- Modify: `features/cv/components/templates/minimal.tsx`
- Modify: `features/cv/components/templates/professional.tsx`
- Modify: `features/cv/components/templates/fresh-graduate.tsx`

**Interfaces:**
- Consumes: `--cv-font-heading`, `--cv-font-body`, wrapper `font-size`/`line-height`/`letter-spacing` from Task 4.
- Produces: templates whose type sizes scale with the wrapper and whose headings use the heading font.

**Conversion rules (apply consistently in every file):**
- Remove the root `<article>` classes that the wrapper now controls: `text-[13px]` (drop — inherits 1em), `leading-relaxed` (drop — wrapper sets line-height). Keep `max-w-[794px]`, background, padding, color, shadow.
- Map absolute Tailwind text sizes to em on the elements that use them:
  - `text-3xl` → `text-[2em]`
  - `text-2xl` → `text-[1.6em]`
  - `text-xl` → `text-[1.35em]`
  - `text-sm` → `text-[0.92em]`
  - `text-xs` → `text-[0.85em]`
  - `text-[0.7rem]` → `text-[0.7em]`
  - `text-[0.65rem]` → `text-[0.65em]`
- Add `font-[family-name:var(--cv-font-heading)]` to the top-level name `<h1>` and every section heading `<h2>`. Leave `<h3>` (entry titles) and body text inheriting the body font.

- [ ] **Step 1: classic.tsx**

- `<article>` L13: remove `text-[13px]` and `leading-relaxed`. Result: `className="mx-auto w-full max-w-[794px] bg-white p-10 text-neutral-800 shadow-sm"`.
- `<h1>` L15: `text-2xl` → `text-[1.6em]`, append `font-[family-name:var(--cv-font-heading)]`.
- headline `<p>` L19: `text-sm` → `text-[0.92em]`.
- contact/link `<p>` L22, L25: `text-xs` → `text-[0.85em]`.
- exp date `<span>` L50, edu date L77, proj `<span>` L142, cert L177, org L211: `text-xs` → `text-[0.85em]`.
- exp location L55, proj skill L148, cert url L183: `text-xs` → `text-[0.85em]`.
- Section `<h2>` L259: `text-xs` → `text-[0.85em]`, append `font-[family-name:var(--cv-font-heading)]`.

- [ ] **Step 2: modern.tsx**

- `<article>` L15: remove `text-[13px]` and `leading-relaxed` (keep grid + other classes).
- `<h1>` L17: `text-xl` → `text-[1.35em]`, append `font-[family-name:var(--cv-font-heading)]`.
- headline L21: `text-sm` → `text-[0.92em]`.
- all `text-xs` occurrences (contact list L25, skills labels L42, interpersonal L61, languages L72, certifications L89, exp date L121, exp company L125): → `text-[0.85em]`.
- `SideSection` `<h2>` L258: `text-[0.65rem]` → `text-[0.65em]`, append `font-[family-name:var(--cv-font-heading)]`.
- `MainSection` `<h2>` L275: `text-xs` → `text-[0.85em]`, append `font-[family-name:var(--cv-font-heading)]`.

- [ ] **Step 3: minimal.tsx**

- `<article>` L13: remove `text-[13px]` and `leading-relaxed` (keep `font-light`, padding, color, shadow, max width).
- `<h1>` L15: `text-3xl` → `text-[2em]`, append `font-[family-name:var(--cv-font-heading)]`.
- headline L19: `text-sm` → `text-[0.92em]`.
- contact L24, link L27: `text-xs` → `text-[0.85em]`.
- all remaining `text-xs` date spans (L46, L51, L71, L95, L171): → `text-[0.85em]`.
- `Section` `<h2>` L218: `text-[0.7rem]` → `text-[0.7em]`, append `font-[family-name:var(--cv-font-heading)]`.

- [ ] **Step 4: professional.tsx**

Open the file first. Apply the same conversion rules: strip `text-[13px]`/`leading-relaxed` from the root article, map every `text-3xl/2xl/xl/sm/xs` and any `text-[0.6*rem]` to the em equivalents above, and add `font-[family-name:var(--cv-font-heading)]` to the name `<h1>` and each section heading `<h2>`. Do not touch the sky color accent classes.

- [ ] **Step 5: fresh-graduate.tsx**

Open the file first. Apply the identical conversion rules as Step 4. Do not touch the emerald color accent classes.

- [ ] **Step 6: Verify lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add features/cv/components/templates/classic.tsx features/cv/components/templates/modern.tsx features/cv/components/templates/minimal.tsx features/cv/components/templates/professional.tsx features/cv/components/templates/fresh-graduate.tsx
git commit -m "feat(cv): em-based sizing + heading font var in templates"
```

---

### Task 6: Typography panel UI + wire into panel switch

**Files:**
- Create: `features/cv/components/panels/typography-panel.tsx`
- Modify: `features/cv/components/panels/index.tsx` (add lazy import ~L17; replace placeholder case L122-128)

**Interfaces:**
- Consumes: store `typography` + `setTypography` (Task 3); `FONTS_BY_CATEGORY`, `FONT_REGISTRY`, `CATEGORY_LABELS` (Task 1); `emptyTypography` (Task 1); shadcn `Select`, `Slider`, `Label`, `Button`.
- Produces: `TypographyPanel` named export rendered for the `typography` panel case.

- [ ] **Step 1: Create `typography-panel.tsx`**

```tsx
"use client";

import { RotateCcwIcon } from "lucide-react";
import type { FontId } from "@/features/cv/schemas/cv";
import { emptyTypography } from "@/features/cv/schemas/cv";
import {
  CATEGORY_LABELS,
  FONT_REGISTRY,
  FONTS_BY_CATEGORY,
} from "@/features/cv/lib/fonts";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

function FontSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: FontId;
  onChange: (value: FontId) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as FontId)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS_BY_CATEGORY.map(({ category, ids }) => (
            <SelectGroup key={category}>
              <SelectLabel>{CATEGORY_LABELS[category]}</SelectLabel>
              {ids.map((fid) => (
                <SelectItem key={fid} value={fid}>
                  {FONT_REGISTRY[fid].label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SliderRow({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {display}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

export function TypographyPanel() {
  const typography = useCvStore((s) => s.typography);
  const setTypography = useCvStore((s) => s.setTypography);

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Tipografi</h2>
        <p className="text-xs text-muted-foreground">
          Atur font, ukuran, dan spasi teks CV Anda.
        </p>
      </div>

      <div className="space-y-6 p-4">
        <FontSelect
          id="font-heading"
          label="Font Judul"
          value={typography.fontHeading}
          onChange={(fontHeading) => setTypography({ fontHeading })}
        />
        <FontSelect
          id="font-body"
          label="Font Isi"
          value={typography.fontBody}
          onChange={(fontBody) => setTypography({ fontBody })}
        />

        <SliderRow
          id="font-scale"
          label="Ukuran"
          value={typography.scale}
          display={`${Math.round(typography.scale * 100)}%`}
          min={0.85}
          max={1.15}
          step={0.05}
          onChange={(scale) => setTypography({ scale })}
        />
        <SliderRow
          id="line-height"
          label="Spasi Baris"
          value={typography.lineHeight}
          display={typography.lineHeight.toFixed(2)}
          min={1.2}
          max={1.8}
          step={0.05}
          onChange={(lineHeight) => setTypography({ lineHeight })}
        />
        <SliderRow
          id="letter-spacing"
          label="Spasi Huruf"
          value={typography.letterSpacing}
          display={`${typography.letterSpacing.toFixed(3)}em`}
          min={-0.02}
          max={0.05}
          step={0.005}
          onChange={(letterSpacing) => setTypography({ letterSpacing })}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTypography({ ...emptyTypography })}
        >
          <RotateCcwIcon className="size-4" />
          Reset ke default
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add lazy import in `panels/index.tsx`**

After the `TemplatePanel` lazy declaration (L15-17), add:

```tsx
const TypographyPanel = lazy(() =>
  import("./typography-panel").then((m) => ({ default: m.TypographyPanel })),
);
```

- [ ] **Step 3: Replace the placeholder case**

Replace the `case "typography":` block (L122-128) with:

```tsx
    case "typography":
      return (
        <Suspense fallback={<Placeholder title="Tipografi" note="Memuat…" />}>
          <TypographyPanel />
        </Suspense>
      );
```

- [ ] **Step 4: Verify shadcn Select subcomponents exist**

Run: `rg "SelectGroup|SelectLabel" components/ui/select.tsx`
Expected: both exported. If missing, add them per shadcn select, or fall back to a flat `SelectItem` list (drop `SelectGroup`/`SelectLabel`) — headings are cosmetic.

- [ ] **Step 5: Verify lint + type check**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run `bun dev`, open a CV editor, click the Tipografi panel:
- Change Font Judul → headings in preview change font.
- Change Font Isi → body text font changes.
- Drag Ukuran → all text scales together, A4 box width unchanged.
- Drag Spasi Baris / Spasi Huruf → spacing updates live.
- Reset → returns to Geist / 100% / 1.50 / 0.000em.
- Wait ~1s → save indicator shows saved; reload page → settings persist.

- [ ] **Step 7: Commit**

```bash
git add features/cv/components/panels/typography-panel.tsx features/cv/components/panels/index.tsx
git commit -m "feat(cv): typography panel UI wired into builder"
```

---

## Self-Review

**Spec coverage:**
- Schema (5 fields) → Task 1. ✓
- Font registry + curated 8 fonts → Task 1. ✓
- Font loading via next/font/google (PDF-safe) → Task 2. ✓
- Preview wrapper CSS vars → Task 4. ✓
- Template em conversion (all 5) + heading var → Task 5. ✓
- Panel UI (2 selects + 3 sliders + reset) → Task 6. ✓
- Store field + mutator + getContent → Task 3. ✓
- Autosave rides existing update (getContent includes typography) → Task 3 Step 7. ✓
- Assert-based test → Task 1 (schema) + Task 3 (store). ✓

**Placeholder scan:** No TBD/TODO. Tasks 4-Step-4/5 and 5-Step-4/5 reference "open the file first" for professional/fresh-graduate because their exact line numbers aren't captured; the conversion rules are explicit and complete.

**Type consistency:** `FontId`, `Typography`, `emptyTypography`, `FONT_IDS`, `FONT_REGISTRY`, `FONTS_BY_CATEGORY`, `CATEGORY_LABELS`, `setTypography(patch)`, `--font-<id>` / `--cv-font-heading` / `--cv-font-body` used consistently across tasks. Base font size 13px matches current template body in Task 4 and Task 5 removal of `text-[13px]`.
