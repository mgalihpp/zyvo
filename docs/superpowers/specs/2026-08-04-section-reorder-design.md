# Design: Section reorder (user-controlled section order)

## Problem

Templates render CV sections in a hardcoded order (e.g. Formal puts projects
after skills; Modern puts projects after experience). Users cannot control
which section appears where. Requests so far ("projects should be higher",
"make formal default") are per-template hacks. We need one mechanism the user
controls.

## Goal

User can reorder the **main sections** of their CV. Order is stored in the CV
content and every template renders sections in that order.

## Scope

**Reorderable (main sections):**
- summary
- experience
- education
- projects
- organizations
- custom

**Fixed (non-main sections):** skills, interpersonal, languages, certifications.
Always rendered after all main sections (single-column templates) or in the
sidebar (two-column templates: Modern, Creative, Compact).

All 10 templates follow the same uniform pattern — fresh-graduate loses its
distinctive two-column education/experience split and becomes a standard
single-column template. Sidebar sections (skills/languages/certifications)
still live in the sidebar on two-column templates.

## Data model

`cvContentSchema` (features/cv/schemas/cv.ts) gains:

```ts
sectionOrder: z.array(
  z.enum(["summary","experience","education","projects","organizations","custom"]),
).default([
  "summary","experience","education","projects","organizations","custom",
]),
```

Default matches today's most common order. Existing CVs get the default via
the Zod default (arrays on update are replaced wholesale, so an omitted
`sectionOrder` in an update is fine — but see Migration note).

### Store

`cv-store.ts`:
- `sectionOrder: string[]` state
- `moveSection(from: number, to: number)` reusing existing `moveItem`, bumps
  revision (autosave handles persistence automatically).
- `getContent()` includes `sectionOrder`.
- `replaceContent` restores it (spread already covers new field).

## UI — ContentPanel

In the "Konten" panel, main-section cards get up/down arrow buttons in their
header (next to the add button). Disabled at list edges. Non-main cards keep
their current appearance.

- No dnd-kit nesting: arrows avoid conflict with the per-item drag inside each
  card.
- Summary card ("Profil") is included and reorderable like the others.

## Template rendering — uniform pattern

Add shared helpers in `features/cv/components/templates/shared.tsx`:

```ts
/** Section ids that have non-empty content, in user order. */
function orderedMainSections(cv: CvContent): Array<"summary"|"experience"|...>
```

Each template replaces its hardcoded main-section sequence with a map over
`orderedMainSections(cv)` using a per-template switch that returns that
template's JSX for the section (or null when the switch is unchanged — summary
is a text block, others render arrays). Non-main sections render after.

Trade-off: templates each keep their own section markup (small diff per
template), at the cost of a switch statement per template.

## Migration

No DB migration needed (MongoDB is schemaless). Existing CV docs simply lack
`sectionOrder`; the server should default it. Findings from the read path:

- `toCvContent()` (`features/cv/lib/cv-content.ts`) builds a fresh object
  field-by-field — it must gain `sectionOrder: cv.sectionOrder ?? DEFAULT`.
- `list` normalizes only personal/colors/typography; `getById` returns the raw
  row. Add the same `sectionOrder` default at both, or route them through
  `toCvContent`.
- `create` must persist `sectionOrder: input?.sectionOrder ?? DEFAULT` (the
  `cvCreateSchema` is partial).
- `update` sends `input.data` straight to Prisma; omitted `sectionOrder` leaves
  the stored value untouched (correct), explicit value is enum-validated
  (correct). No change needed.
- `restoreVersion`/`getVersion` flow through `toCvContent`, so fixing that
  function covers them.

Export the default order as `DEFAULT_SECTION_ORDER` from `features/cv/schemas/cv.ts`
and reuse it in the schema default, store init, router, and `toCvContent` so the
value lives in exactly one place.

## Files touched

- `features/cv/schemas/cv.ts` — schema + default
- `features/cv/stores/cv-store.ts` — state + `moveSection`
- `features/cv/stores/cv-store-provider.tsx` — no change expected (CvContent spread)
- `features/cv/components/panels/content-panel.tsx` — arrows on main cards
- `features/cv/components/templates/shared.tsx` — `orderedMainSections` helper
- All 10 template files — render main sections by order
- `features/cv/lib/cv-content.ts` — check for order-dependent helpers
- `features/cv/server/cv-router.ts` — verify read path defaults

## Out of scope

- Reordering sidebar sections
- Per-template section order (order is global to the CV)
- Drag-and-drop reorder of section cards
