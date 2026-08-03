# Formal CV Template — Design Spec

## Overview

Add a new free CV template called "Formal" — a single-column, ATS-friendly layout with centered header, serif typography, and full-width section dividers. Inspired by traditional formal resume designs.

## Design

### Layout
- **Single-column** (ATS-safe, no multi-column tricks)
- Centered header: name (large serif), headline, contact line (pipe-separated)
- Section headings: left-aligned, uppercase, full-width `border-bottom`
- Generous whitespace, clean serif typography

### Section Order
1. Profil (summary)
2. Pendidikan (education)
3. Pengalaman (experience)
4. Keahlian (skills) — inline `Name (Level)` format
5. Bahasa (languages) — inline `Name (Level)` format
6. Proyek, Sertifikasi, Organisasi, Tambahan (conditional)

### Entry Format
- **Experience**: Role + Company on left, Location + Date on right, bullet points below
- **Education**: School on left, Location + Date on right, degree/field/GPA below
- **Skills**: Inline comma/bullet separated with level in parentheses
- **Languages**: Inline with level in parentheses

### Default Colors
```typescript
{
  presetId: "neutral",
  background: "#ffffff",
  heading: "#1a1a2e",    // dark navy
  text: "#333333",
  link: "#1a1a2e",
  accent: "#1a1a2e",
}
```

### Default Typography
```typescript
{
  fontHeading: "lora",   // serif
  fontBody: "lora",      // serif
}
```

## Files to Modify

1. **`features/cv/components/templates/formal.tsx`** — New template component (new file)
2. **`features/cv/components/templates/index.ts`** — Add lazy import + TEMPLATES entry
3. **`features/cv/components/templates/eager.ts`** — Add eager import
4. **`features/cv/components/templates/template-colors.ts`** — Add default colors + fonts

## Component Structure

```tsx
import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

export function FormalTemplate({ cv }: TemplateProps) {
  // Centered header with name, headline, contact line (pipe-separated)
  // Sections with full-width border-bottom headings
  // All sections conditionally rendered
}

function Section({ title, children }) {
  // Left-aligned, uppercase, full-width border-bottom
}
```

## Conventions Followed
- `CvPage` wrapper with `p-10` padding
- `data-entry` on all list items
- CSS vars for all colors (`--cv-color-*`)
- `font-[family-name:var(--cv-font-heading)]` on headings
- Conditional rendering per section
- `formatDateRange()`, `join()` utilities from `./shared`

## Verification
- Run `bun lint` to check Biome formatting
- Visual check in builder template picker
- PDF export test via Puppeteer
