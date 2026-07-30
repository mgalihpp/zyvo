# Typography Panel — Design

Date: 2026-07-27

## Goal

Add a working **Typography** panel to the CV builder (currently a placeholder at
`features/cv/components/panels/index.tsx` L122-128). Users control font family
(separate heading/body), size scale, line height, and letter spacing. Settings
persist per-CV and render live in the preview across all 5 templates.

## Current state

- Only style knob today: `templateId` (string) in `cvContentSchema`.
- Templates use hardcoded Tailwind type sizes (`text-[13px]`, `text-2xl`, ...),
  font inherited from root `Geist` (`app/layout.tsx`).
- `typography` panel enum value already reserved in the store; panel is a
  placeholder.
- CV content is the save unit: Zod `cvContentSchema` → tRPC `cv.update` →
  800ms debounced autosave on store `revision`.

## Architecture

Typography is stored as an embedded object on `cvContent` (same pattern as CV
sections — MongoDB composite). It flows through the existing tRPC update +
autosave automatically. The preview wrapper injects CSS variables; templates
read them. Size scale requires a one-time em conversion of the 5 templates.

Rejected alternatives:
- Separate Prisma field / separate tRPC mutation → extra coupling, no benefit.
- Per-template typography prop → touches `TemplateProps` + 5 files anyway and
  loses the "set once at wrapper" simplicity.

## Components

### 1. Schema — `features/cv/schemas/cv.ts`

`FONT_IDS = ["geist","inter","roboto","lato","merriweather","lora","source-serif","jetbrains-mono"]`

```
typographySchema = z.object({
  fontHeading:   z.enum(FONT_IDS).default("geist"),
  fontBody:      z.enum(FONT_IDS).default("geist"),
  scale:         z.number().min(0.85).max(1.15).default(1),      // multiplier on base 13px
  lineHeight:    z.number().min(1.2).max(1.8).default(1.5),
  letterSpacing: z.number().min(-0.02).max(0.05).default(0),     // em
})
```

- Add `typography: typographySchema.default({...})` to `cvContentSchema`.
- `cvUpdateSchema = cvContentSchema.partial()` auto-covers it.
- Export `Typography` type + `emptyTypography` default constant.

Skipped: font weight control, per-section overrides. Add when users ask.

### 2. Font registry — `features/cv/lib/fonts.ts` (new)

Maps each font id → `{ label: string, category: "sans"|"serif"|"mono", cssVar: string }`.
Provides the panel with display labels + grouping, and gives the preview wrapper
the CSS var name per id. `cssVar` matches the `--font-<id>` set in layout.

### 3. Font loading — `app/layout.tsx`

Add 7 `next/font/google` imports (Geist already present):
Inter, Roboto, Lato, Merriweather, Lora, Source_Serif_4, JetBrains_Mono.
Each `{ variable: "--font-<id>", subsets: ["latin"], display: "swap" }`.
Append every `.variable` to the `<html>` className. All self-hosted → PDF-safe,
no runtime fetch.

Skipped: lazy per-CV font loading / subsetting. All 8 preloaded (small,
cacheable). Add subsetting if bundle grows.

### 4. Preview wrapper — `features/cv/components/cv-preview.tsx`

Read `typography` from the store, wrap `<Template cv={content} />` in a
`<div>` whose inline `style` sets:

```
--cv-font-heading: var(<registry[fontHeading].cssVar>)
--cv-font-body:    var(<registry[fontBody].cssVar>)
fontSize:      `${13 * scale}px`
lineHeight:    lineHeight
letterSpacing: `${letterSpacing}em`
fontFamily:    var(--cv-font-body)
```

### 5. Templates (all 5) — em conversion

Replace absolute type sizes with em (relative to wrapper `font-size`) so `scale`
applies. Consistent map across classic / modern / minimal / professional /
fresh-graduate:

- Body `text-[13px]` → drop (inherit `1em` from wrapper).
- `text-2xl` → `text-[1.6em]`, `text-sm` → `text-[0.92em]`,
  `text-xs` → `text-[0.85em]` (apply the same ratios wherever used).
- Headings get `font-[family-name:var(--cv-font-heading)]`; body inherits
  `--cv-font-body` from wrapper.
- Remove `leading-relaxed` (wrapper controls line-height).

Skipped: color logic (belongs to the separate colors panel).

### 6. Typography panel — `features/cv/components/panels/typography-panel.tsx` (new)

Replace the placeholder case in `panels/index.tsx` L122-128 with a lazy-loaded
panel (mirror the existing `lazy(() => import(...))` + `Suspense` pattern used
for content/template panels). Controls:

- 2 font `Select`s (heading, body), options grouped by `category`.
- 3 `Slider`s (scale, lineHeight, letterSpacing) with live value labels.
- Reset-to-default button.

Uses shadcn `Select` + `Slider`. Each control calls a new store mutator.

### 7. Store — `features/cv/stores/cv-store.ts`

- Add `typography` to `CvState`, `emptyContent`, and `getContent` serialization.
- Add `setTypography(partial: Partial<Typography>)` mutator that merges and
  calls `touch()` (bumps `revision` → triggers autosave).

## Data flow

Panel control → `setTypography` → store update + `touch()` →
(a) `CvPreview` re-reads `typography`, updates wrapper CSS vars → live render;
(b) autosave hook (revision) → `trpc.cv.update({ typography })` → MongoDB.
Reload → CV content (incl. `typography`) hydrates store → preview matches.

## Error handling

Typography rides the existing tRPC update path — no new failure modes. Zod
defaults guarantee valid values; enum guards font ids. Unknown/legacy CVs
without `typography` get schema defaults on parse.

## Testing

- Autosave/tRPC path unchanged (typography rides existing update).
- One assert-based check: `typographySchema.parse(emptyTypography)` round-trips
  and all defaults are valid.
- Manual: change each control → preview updates live → reload persists.

## Files touched

`schemas/cv.ts`, new `features/cv/lib/fonts.ts`, `app/layout.tsx`,
`components/cv-preview.tsx`, 5 templates in `components/templates/`,
new `components/panels/typography-panel.tsx`, `components/panels/index.tsx`,
`stores/cv-store.ts`.
