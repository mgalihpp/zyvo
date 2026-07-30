# CV Color/Theme Feature — Design Spec

## 1. Overview

Add a **Warna** panel to the CV builder letting users choose 5 semantic colors — background, heading, text, link, accent — per CV via 5 preset themes or manual hex color pickers. Colors flow to all 5 templates through CSS custom properties (matching the existing `--cv-font-*` typography pattern). Preview updates live from a local draft; an explicit **Terapkan** button commits to the Zustand store, which triggers the existing 800ms autosave.

## 2. User journey

1. User opens CV editor → clicks **Warna** sidebar icon (already wired).
2. Panel shows **Tema Preset** tab (default) with 5 swatch cards. Selecting a card sets all 5 tokens to that preset and updates preview immediately.
3. User can switch to **Kustom** tab → 5 rows of native `<input type="color">` + hex text input. Editing any token sets preset to `"custom"`.
4. Throughout, preview reflects draft (not store). A contrast-ratio badge appears under each affected pair (text/bg, heading/bg, link/bg) — warns when < WCAG AA (4.5:1) but never blocks.
5. **Terapkan** button commits draft → `setColors(draft)` → store bump → autosave fires. **Reset ke default** reverts to the neutral preset.

## 3. Data model

### 3.1 Zod schema (`features/cv/schemas/cv.ts`)

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
```

### 3.2 Extend `cvContentSchema`

Add a `colors: colorsSchema` field next to `typography`. Existing stored CVs without `colors` receive `.default()` on read — no migration needed. `cvUpdateSchema` inherits it via `.partial()`.

### 3.3 Store (`features/cv/stores/cv-store.ts`)

- Add `colors: CvColors` to `CvState` interface + default (`emptyColors`).
- Add `draftColors: CvColors | null` (null = showing committed colors).
- Actions:
  - `setColors: (colors: CvColors) => void` — commits + touch, used by Terapkan.
  - `setDraftColors: (colors: CvColors) => void` — writes draft only (no touch, no autosave).
  - `commitColors: () => void` — copies `draftColors` → `colors`, clears draft, touch.
  - `resetColors: () => void` — clears `draftColors` only (preview reverts to committed).
- Include `colors` in `getContent()` so it persists through tRPC `cv.update`.

### 3.4 Draft preview mechanism

Because `CvPreview` and `PanelContent` are siblings under the same `CvStoreProvider`, the draft flows through the store:

1. **ColorsPanel** writes to `draftColors` on every color change (no `touch()`, no autosave).
2. **CvPreview** selects `activePanel` and `draftColors`:
   ```ts
   const activePanel = useCvStore((s) => s.activePanel);
   const committedColors = useCvStore((s) => s.colors);
   const draftColors = useCvStore((s) => s.draftColors);
   const colors = activePanel === "colors" && draftColors ? draftColors : committedColors;
   ```
3. **Terapkan** calls `commitColors()` → `draftColors` cleared, `colors` written + `touch()` → autosave fires.
4. **Reset ke default** calls `resetColors()` — preview snaps back to committed colors.

### 3.5 Prisma schema

No change. The `content` field is a MongoDB document (Json). Adding `colors` to the decoupled `CvContent` TypeScript type is sufficient — Prisma serializes/deserializes it transparently.

## 4. Presets (`features/cv/lib/color-presets.ts`)

5 presets, each tested against WCAG AA (text/bg ≥ 4.5, heading/bg ≥ 4.5, link/bg ≥ 4.5):

| id | label | background | heading | text | link | accent |
|---|---|---|---|---|---|---|
| `professional` | Profesional | `#ffffff` | `#1e3a5f` | `#333333` | `#1e5a8f` | `#1e3a5f` |
| `modern` | Modern | `#ffffff` | `#0f172a` | `#334155` | `#2563eb` | `#2563eb` |
| `colorful` | Berwarna | `#fffdf7` | `#7c2d12` | `#3f3f46` | `#c2410c` | `#ea580c` |
| `dark` | Gelap | `#1a1a1a` | `#ffffff` | `#e5e5e5` | `#7dd3fc` | `#38bdf8` |
| `neutral` | Netral | `#ffffff` | `#171717` | `#404040` | `#525252` | `#171717` |

Each preset object conforms to `CvColors`. Exported as `const PRESETS: Record<ColorsPresetId, CvColors>`.

## 5. CSS variable wiring

### 5.1 Preview wrapper (`features/cv/components/cv-preview.tsx`)

Select `activePanel`, `colors`, and `draftColors` from the store. If `activePanel === "colors"` and `draftColors` is non-null, use draft colors for preview; otherwise use committed colors. Add 5 CSS custom properties to the existing inline `style` object:

```ts
const activePanel = useCvStore((s) => s.activePanel);
const committedColors = useCvStore((s) => s.colors);
const draftColors = useCvStore((s) => s.draftColors);
const colors = activePanel === "colors" && draftColors ? draftColors : committedColors;

// In the style object:
"--cv-color-bg":        colors.background,
"--cv-color-heading":   colors.heading,
"--cv-color-text":      colors.text,
"--cv-color-link":      colors.link,
"--cv-color-accent":    colors.accent,
```

### 5.2 Template refactor (all 5 templates)

Replace every hardcoded Tailwind color class with `var()` references via `bg-[var(--cv-color-*)]` / `text-[var(--cv-color-*)]` / `border-[var(--cv-color-*)]`:

| Hardcoded class | Replaced with |
|---|---|
| `bg-white`, `bg-neutral-50` | `bg-[var(--cv-color-bg)]` |
| `text-neutral-900`, `text-sky-800` (headings) | `text-[var(--cv-color-heading)]` |
| `text-neutral-800`, `text-neutral-700` (body) | `text-[var(--cv-color-text)]` |
| `text-neutral-600`, `text-neutral-500` (metadata) | `text-[var(--cv-color-text)]` with `opacity-70` |
| URL strings | `text-[var(--cv-color-link)]` |
| `border-neutral-300` | `border-[var(--cv-color-accent)]` with `opacity-30` |
| `bg-sky-800`, `bg-neutral-900`, `bg-emerald-50` | `bg-[var(--cv-color-accent)]` |

**Multi-region mapping** (per the "5 tokens, templates map them" decision):
- **modern**: sidebar bg = `accent`; sidebar text = `readableOn(accent)` utility (white or near-black)
- **professional**: header band bg = `accent`; header text = `readableOn(accent)`
- **fresh-graduate**: skill chips bg = `accent` at 15% opacity (`color-mix` or custom property with alpha)
- All skill/tag chips: `bg / text` pair built from accent

Every template already has `print:[print-color-adjust:exact]` on colored regions — keep these so PDF export honors user colors.

## 6. Panel UI (`features/cv/components/panels/colors-panel.tsx`)

### 6.1 Structure (lazy-loaded, own `ColorsSkeleton` in `panels/index.tsx`)

```
┌─────────────────────────────────┐
│ Warna                           │
│ Atur warna tema CV Anda.        │
├─────────────────────────────────┤
│ ┌─────────────┬───────────────┐ │
│ │ Tema Preset  │ Kustom       │ │
│ ├─────────────┴───────────────┤ │
│ │ [swatch cards] / [pickers]  │ │
│ │                             │ │
│ │ Contrast: 4.8:1  ✓         │ │
│ │        3.2:1  ⚠ rendah     │ │
│ │                             │ │
│ │ [Terapkan] [Reset default]  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 6.2 Preset tab

5 cards in a grid (2+2+1 or 3+2). Each card shows:
- A mini palette (5 tiny color squares)
- Preset name
- Active ring if selected

Clicking sets draft to that preset's 5 hex values; `presetId` = the preset id.

### 6.3 Custom tab

5 rows, each: label → native `<input type="color">` → hex text input. Editing either input updates the other and sets `presetId = "custom"`.

### 6.4 Contrast warnings

Below the pickers, a row per checked pair showing: color swatch pair → "Heading:background → 7.2:1 ✓" or "Text:background → 3.1:1 ⚠ Rendah". Uses the utility from §7. Checks: text/bg, heading/bg, link/bg. Warn only — no block.

### 6.5 Terapkan / Reset footer

**Terapkan** button commits draft to store (`setColors(draft)`). Disabled when draft is deep-equal to store value. **Reset ke default** fills draft with the `neutral` preset. Both buttons bump `revision` and trigger autosave.

## 7. Utility library (`features/cv/lib/contrast.ts`)

Pure functions:

```ts
hexToRgb(hex: string): { r: number; g: number; b: number }
relativeLuminance(rgb: { r: number; g: number; b: number }): number
contrastRatio(a: string, b: string): number        // two hex strings → ratio
passesAA(fg: string, bg: string): boolean          // ratio ≥ 4.5
passesAALarge(fg: string, bg: string): boolean     // ratio ≥ 3.0
readableOn(bg: string): string                     // returns "#ffffff" or "#000000" depending on luminance
```

### 7.1 Test (`features/cv/lib/__tests__/contrast.test.ts`)

- black/white ratio = 21
- Every preset's text/bg, heading/bg, link/bg each passes AA
- `readableOn("#000000")` returns `"#ffffff"`, `readableOn("#ffffff")` returns `"#000000"`

## 8. Files to create/modify

| File | Action |
|---|---|
| `features/cv/schemas/cv.ts` | Add `colorsSchema`, `CvColors`, `emptyColors`, `COLORS_PRESETS` |
| `features/cv/stores/cv-store.ts` | Add `colors` to state, `CvState` interface, `setColors`, `getContent()` |
| `features/cv/lib/color-presets.ts` | **Create** — 5 preset objects |
| `features/cv/lib/contrast.ts` | **Create** — contrast utilities |
| `features/cv/lib/__tests__/contrast.test.ts` | **Create** — contrast unit test |
| `features/cv/components/panels/colors-panel.tsx` | **Create** — panel component |
| `features/cv/components/panels/index.tsx` | Replace `colors` Placeholder → Suspense/lazy `ColorsPanel` |
| `features/cv/components/cv-preview.tsx` | Read `colors` from store, pass as CSS vars |
| `features/cv/components/templates/classic.tsx` | Replace color classes with `var()` |
| `features/cv/components/templates/modern.tsx` | Same |
| `features/cv/components/templates/professional.tsx` | Same |
| `features/cv/components/templates/minimal.tsx` | Same |
| `features/cv/components/templates/fresh-graduate.tsx` | Same |

## 9. Out of scope

- PDF export wiring (separate feature)
- Per-section color overrides, gradients, background images
- Auto-correct / one-click contrast fix (warn-only chosen)
- Color picker beyond native `<input type="color">` (e.g. eyedropper, palette generators)

## 10. Edge cases

- **Loading existing CV without `colors`**: `.default()` on Zod schema ensures every CV has a valid `colors` object. The template falls back gracefully because the store initializes from the default.
- **Print/PDF**: All colored elements already carry `print:[print-color-adjust:exact]`. The CSS var values are inline on the preview wrapper's `style` prop, so they're available during Puppeteer rendering.
- **Contrast with dark templates**: The `readableOn` utility ensures sidebar/header text is always readable against the accent color, regardless of how light or dark the user picks.
- **Reset ke default after Terapkan**: Reset fills the draft with the `neutral` preset. Terapkan must be clicked again to persist. No auto-reset, no hidden state.
