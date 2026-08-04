# Section Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reorder the six main CV sections (summary, experience, education, projects, organizations, custom) via up/down arrows; every template renders them in that stored order.

**Architecture:** A new `sectionOrder: string[]` content field on `CV` (schema + Prisma + router + store + preview). A shared `orderedMainSections(cv)` helper in `templates/shared.tsx` returns section ids in user order, filtered to those with content, defensively falling back to `DEFAULT_SECTION_ORDER` when the field is missing (dashboard thumbnails and `getById` consumers pass raw rows cast to `CvContent`). Each template replaces its hardcoded main-section JSX with `orderedMainSections(cv).map(...)` over a per-template switch. Non-main sections (skills, interpersonal, languages, certifications) render at the end (single-column) or sidebar (two-column), unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Zustand, Prisma (MongoDB), dnd-kit (already present), Biome, bun.

## Global Constraints

- Commands: `bun lint` (Biome), `bun build`, `bun test <file>`, `bun db:push`, `bun db:generate`.
- Tests: `bun:test`. Templates have no unit tests — verify template tasks via `bun lint` + `bun build`.
- Default order constant lives in exactly one place: `DEFAULT_SECTION_ORDER` exported from `features/cv/schemas/cv.ts`.
- `orderedMainSections` MUST fall back to `DEFAULT_SECTION_ORDER` on missing/partial `sectionOrder` (raw rows are cast to `CvContent` without normalization).
- Main sections: `summary`, `experience`, `education`, `projects`, `organizations`, `custom`. Non-main stay fixed.
- Do not reorder sidebar sections. Do not change section inner markup/classes — only their render order.
- `data-entry` attribute on every section item wrapper must be preserved (pagination depends on it).
- All UI copy stays in Indonesian.

---

### Task 1: Schema — `sectionOrder` + `DEFAULT_SECTION_ORDER`

**Files:**
- Modify: `features/cv/schemas/cv.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const MAIN_SECTION_IDS = ["summary","experience","education","projects","organizations","custom"] as const`
  - `export type MainSectionId = (typeof MAIN_SECTION_IDS)[number]`
  - `export const DEFAULT_SECTION_ORDER: MainSectionId[] = ["summary","experience","education","projects","organizations","custom"]`
  - `cvContentSchema.sectionOrder: z.array(z.enum(MAIN_SECTION_IDS)).default(DEFAULT_SECTION_ORDER)`

- [ ] **Step 1: Add the constants and schema field**

Add after `customSchema` (before `FONT_IDS`):

```ts
/** The six user-reorderable main sections, in default render order. */
export const MAIN_SECTION_IDS = [
  "summary",
  "experience",
  "education",
  "projects",
  "organizations",
  "custom",
] as const;
export type MainSectionId = (typeof MAIN_SECTION_IDS)[number];
export const DEFAULT_SECTION_ORDER: MainSectionId[] = [...MAIN_SECTION_IDS];
```

In `cvContentSchema`, after `custom: z.array(customSchema).default([]),`:

```ts
sectionOrder: z.array(z.enum(MAIN_SECTION_IDS)).default(DEFAULT_SECTION_ORDER),
```

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `bun test features/cv/lib/cv-content.test.ts`
Expected: PASS (4 tests). `cvCreateSchema` is `.partial()`, so the new optional field doesn't break the existing create test.

- [ ] **Step 3: Commit**

```bash
git add features/cv/schemas/cv.ts
git commit -m "feat(cv): add sectionOrder schema and DEFAULT_SECTION_ORDER"
```

---

### Task 2: Store — `sectionOrder` state + `moveSection`

**Files:**
- Modify: `features/cv/stores/cv-store.ts`

**Interfaces:**
- Consumes: `DEFAULT_SECTION_ORDER` from `@/features/cv/schemas/cv`.
- Produces:
  - `CvState.sectionOrder: string[]`
  - `CvState.moveSection(from: number, to: number): void` (touches + bumps revision)
  - `getContent()` returns `sectionOrder`.
  - `replaceContent` carries it (spread already covers new field).

- [ ] **Step 1: Add state type + method signature**

In the `CvState` interface, after `custom`/`reorderCustom` block (near line 172), add:

```ts
sectionOrder: string[];
moveSection: (from: number, to: number) => void;
```

- [ ] **Step 2: Add to `emptyContent`**

```ts
sectionOrder: [...DEFAULT_SECTION_ORDER],
```

- [ ] **Step 3: Add to store init spread**

The store seeds `...(init?.content ?? emptyContent)`, which already covers `sectionOrder` when present. Add a fallback so a store seeded without it (e.g. tests) still gets the default:

```ts
...(init?.content ?? emptyContent),
sectionOrder: init?.content?.sectionOrder ?? [...DEFAULT_SECTION_ORDER],
```

- [ ] **Step 4: Add the `moveSection` action**

After the `reorderCustom` action (line ~532), add:

```ts
moveSection: (from, to) =>
  set((s) => ({
    sectionOrder: moveItem(s.sectionOrder, from, to),
    ...touch()(s),
  })),
```

- [ ] **Step 5: Add `sectionOrder` to `getContent()`**

In `getContent()`, after `custom: s.custom,`:

```ts
sectionOrder: s.sectionOrder,
```

- [ ] **Step 6: Write the store test**

Create: `features/cv/stores/__tests__/section-order-store.test.ts`

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_SECTION_ORDER } from "@/features/cv/schemas/cv";
import { createCvStore } from "@/features/cv/stores/cv-store";

test("store seeds default section order", () => {
  const store = createCvStore();
  assert.deepEqual(store.getState().sectionOrder, DEFAULT_SECTION_ORDER);
});

test("moveSection reorders, touches, and persists via getContent", () => {
  const store = createCvStore();
  const before = store.getState().revision;

  store.getState().moveSection(1, 3);

  const s = store.getState();
  assert.deepEqual(s.sectionOrder, [
    "summary",
    "education",
    "projects",
    "experience",
    "organizations",
    "custom",
  ]);
  assert.equal(s.revision, before + 1);
  assert.equal(s.saveStatus, "dirty");
  assert.deepEqual(s.getContent().sectionOrder, s.sectionOrder);
});
```

- [ ] **Step 7: Run the store tests**

Run: `bun test features/cv/stores/__tests__/section-order-store.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add features/cv/stores/cv-store.ts features/cv/stores/__tests__/section-order-store.test.ts
git commit -m "feat(cv): add sectionOrder state and moveSection to store"
```

---

### Task 3: Prisma — `sectionOrder` on the `CV` model

**Files:**
- Modify: `prisma/schema.prisma`
- Generated: `prisma/client` (via `bun db:push` + `bun db:generate`)

**Interfaces:**
- Consumes: nothing.
- Produces: `CV.sectionOrder: string[] | null` (MongoDB list field, nullable so legacy docs read as null).

- [ ] **Step 1: Add the field**

In `model CV`, after `custom Custom[]`:

```prisma
sectionOrder String[]
```

- [ ] **Step 2: Push + regenerate**

Run: `bun db:push`
Expected: MongoDB field added; existing docs unaffected (missing field reads as `null`).
Run: `bun db:generate`
Expected: Prisma Client regenerated without error.

- [ ] **Step 3: Verify the model compiles**

Run: `bun lint prisma/schema.prisma 2>$null; bun test features/cv/lib/cv-content.test.ts`
Expected: test PASS (tests compile against the regenerated client).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(cv): add sectionOrder field to CV model"
```

---

### Task 4: Read path — `toCvContent`, router `list`/`getById`/`create`

**Files:**
- Modify: `features/cv/lib/cv-content.ts`
- Modify: `features/cv/server/cv-router.ts`
- Test: `features/cv/lib/cv-content.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SECTION_ORDER` from `@/features/cv/schemas/cv`.
- Produces: `toCvContent` returns `sectionOrder` normalized; router `list`/`getById`/`create` persist/return it.

- [ ] **Step 1: Add failing test for `toCvContent`**

Append to the `toCvContent` describe block in `features/cv/lib/cv-content.test.ts`:

```ts
it("defaults sectionOrder when the document predates it", () => {
  const content = toCvContent(mockCv());
  expect(content.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
});

it("preserves a stored sectionOrder", () => {
  const order = ["education", "summary"];
  const content = toCvContent(mockCv({ sectionOrder: order }));
  expect(content.sectionOrder).toEqual(order);
});
```

Import `DEFAULT_SECTION_ORDER` at the top of the test file:

```ts
import { cvCreateSchema, DEFAULT_SECTION_ORDER } from "../schemas/cv";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/cv/lib/cv-content.test.ts`
Expected: FAIL — `content.sectionOrder` is `undefined`.

- [ ] **Step 3: Add `sectionOrder` to `toCvContent`**

In `features/cv/lib/cv-content.ts`, import `DEFAULT_SECTION_ORDER`, and add to the returned object (after `showLanguageLevels`):

```ts
sectionOrder: cv.sectionOrder ?? DEFAULT_SECTION_ORDER,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/cv/lib/cv-content.test.ts`
Expected: PASS.

- [ ] **Step 5: Update router `list` select + normalization**

In `cv-router.ts`:
- Add `sectionOrder: true,` to the `select` in `list`.
- Add `sectionOrder: cv.sectionOrder ?? DEFAULT_SECTION_ORDER,` to the mapped return in `list`.

Import `DEFAULT_SECTION_ORDER` alongside the existing `cvCreateSchema` import.

- [ ] **Step 6: Update router `getById`**

`getById` returns the raw row. Add a normalized field so consumers casting to `CvContent` get a default:

```ts
return { ...cv, sectionOrder: cv.sectionOrder ?? DEFAULT_SECTION_ORDER };
```

- [ ] **Step 7: Update router `create`**

Persist the default at creation (the `cvCreateSchema` is partial):

```ts
sectionOrder: input?.sectionOrder ?? DEFAULT_SECTION_ORDER,
```

- [ ] **Step 8: Run lint + tests**

Run: `bun lint`
Expected: PASS.
Run: `bun test features/cv/lib/cv-content.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add features/cv/lib/cv-content.ts features/cv/lib/cv-content.test.ts features/cv/server/cv-router.ts
git commit -m "feat(cv): normalize sectionOrder on read and persist on create"
```

---

### Task 5: Shared helper — `orderedMainSections`

**Files:**
- Modify: `features/cv/components/templates/shared.tsx`
- Create: `features/cv/components/templates/__tests__/ordered-main-sections.test.ts`

**Interfaces:**
- Consumes: `MainSectionId`, `DEFAULT_SECTION_ORDER`, `CvContent` from `@/features/cv/schemas/cv`.
- Produces: `export function orderedMainSections(cv: CvContent): MainSectionId[]` — section ids with content, in user order, defaulted when missing.

- [ ] **Step 1: Write the failing test**

Create: `features/cv/components/templates/__tests__/ordered-main-sections.test.ts`

```ts
import { describe, expect, it } from "bun:test";
import { DEFAULT_SECTION_ORDER } from "@/features/cv/schemas/cv";
import { orderedMainSections } from "../shared";

function baseCv(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sectionOrder: undefined,
    summary: "",
    experience: [],
    education: [],
    projects: [],
    organizations: [],
    custom: [],
    ...overrides,
  } as never;
}

describe("orderedMainSections", () => {
  it("defaults to DEFAULT_SECTION_ORDER when sectionOrder is missing", () => {
    const cv = baseCv({ summary: "x" });
    expect(orderedMainSections(cv)).toEqual(["summary"]);
  });

  it("follows user order", () => {
    const cv = baseCv({
      sectionOrder: ["projects", "summary"],
      summary: "x",
      projects: [{ name: "A" }],
    });
    expect(orderedMainSections(cv)).toEqual(["projects", "summary"]);
  });

  it("drops sections with no content", () => {
    const cv = baseCv({
      sectionOrder: ["education", "summary", "custom"],
      summary: "x",
      education: [{ school: "S" }],
    });
    expect(orderedMainSections(cv)).toEqual(["education", "summary"]);
  });

  it("ignores unknown ids in a stored order", () => {
    const cv = baseCv({
      sectionOrder: ["projects", "bogus", "summary"],
      summary: "x",
      projects: [{ name: "A" }],
    });
    expect(orderedMainSections(cv)).toEqual(["projects", "summary"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/cv/components/templates/__tests__/ordered-main-sections.test.ts`
Expected: FAIL — `orderedMainSections` not exported.

- [ ] **Step 3: Write the helper**

In `features/cv/components/templates/shared.tsx`, add imports and the function:

```ts
import type {
  CvContent,
  MainSectionId,
} from "@/features/cv/schemas/cv";
import { DEFAULT_SECTION_ORDER } from "@/features/cv/schemas/cv";

const VALID_MAIN: ReadonlySet<string> = new Set(DEFAULT_SECTION_ORDER);

function hasSectionContent(cv: CvContent, id: MainSectionId): boolean {
  switch (id) {
    case "summary":
      return Boolean(cv.summary?.trim());
    case "experience":
      return cv.experience.length > 0;
    case "education":
      return cv.education.length > 0;
    case "projects":
      return cv.projects.length > 0;
    case "organizations":
      return cv.organizations.length > 0;
    case "custom":
      return cv.custom.length > 0;
  }
}

/** Main section ids in user order, filtered to those with content. Falls back
 *  to DEFAULT_SECTION_ORDER when the stored order is missing or contains
 *  unknown/duplicate ids. */
export function orderedMainSections(cv: CvContent): MainSectionId[] {
  const seen = new Set<MainSectionId>();
  for (const id of cv.sectionOrder ?? DEFAULT_SECTION_ORDER) {
    if (!VALID_MAIN.has(id) || seen.has(id as MainSectionId)) continue;
    const section = id as MainSectionId;
    if (hasSectionContent(cv, section)) seen.add(section);
  }
  return [...seen];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/cv/components/templates/__tests__/ordered-main-sections.test.ts`
Expected: PASS.

- [ ] **Step 5: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add features/cv/components/templates/shared.tsx features/cv/components/templates/__tests__/ordered-main-sections.test.ts
git commit -m "feat(cv): add orderedMainSections helper"
```

---

### Task 6: Live preview — include `sectionOrder` in `liveContent`

**Files:**
- Modify: `features/cv/components/cv-preview.tsx`

**Interfaces:**
- Consumes: `sectionOrder` from the store.
- Produces: `liveContent.sectionOrder` so templates reorder the live preview.

- [ ] **Step 1: Read the field**

Add with the other individual selectors (after `custom`, line ~46):

```ts
const sectionOrder = useCvStore((s) => s.sectionOrder);
```

- [ ] **Step 2: Include in `liveContent`**

In the `liveContent` object, after `custom,`:

```ts
sectionOrder,
```

- [ ] **Step 3: Verify build**

Run: `bun lint`
Expected: PASS.
Run: `bun build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add features/cv/components/cv-preview.tsx
git commit -m "feat(cv): pass sectionOrder into live preview content"
```

---

### Task 7: ContentPanel — up/down arrows on main section cards

**Files:**
- Modify: `features/cv/components/panels/content-panel.tsx`

**Interfaces:**
- Consumes: `sectionOrder`, `moveSection` from the store.
- Produces: arrows on the six main section cards (Profil, Pengalaman, Pendidikan, Proyek, Organisasi, Kustom). Non-main cards unchanged.

- [ ] **Step 1: Add imports**

Add to the lucide-react import:

```ts
ArrowDownIcon,
ArrowUpIcon,
```

- [ ] **Step 2: Add moveSection + sectionOrder to ContentPanel**

In `ContentPanel()`, add:

```ts
const sectionOrder = useCvStore((s) => s.sectionOrder);
const moveSection = useCvStore((s) => s.moveSection);
```

- [ ] **Step 3: Add arrow buttons to SectionCard header**

Change `SectionCard`'s header so it accepts optional `moveUp`/`moveDown` handlers and renders them between the title and the add button:

```ts
function SectionCard({
  icon: Icon,
  title,
  items,
  onAdd,
  onEdit,
  onRemove,
  onReorder,
  moveUp,
  moveDown,
  emptyLabel,
}: {
  icon: LucideIcon;
  title: string;
  items: { id: string; label: string }[];
  onAdd?: () => void;
  onEdit: (index: number) => void;
  onRemove?: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  moveUp?: () => void;
  moveDown?: () => void;
  emptyLabel: string;
}) {
```

In the header `div`, after the `<h3>` and before `{onAdd ? ...}`, add:

```tsx
{moveUp || moveDown ? (
  <div className="flex shrink-0 items-center gap-0.5">
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={moveUp}
      disabled={!moveUp}
      aria-label={`Pindah ${title} ke atas`}
    >
      <ArrowUpIcon />
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={moveDown}
      disabled={!moveDown}
      aria-label={`Pindah ${title} ke bawah`}
    >
      <ArrowDownIcon />
    </Button>
  </div>
) : null}
```

- [ ] **Step 4: Wire arrows to the six main cards**

Add a small helper inside `ContentPanel` to compute arrow handlers by index:

```tsx
const sectionCards = [
  "summary",
  "experience",
  "education",
  "projects",
  "organizations",
  "custom",
];
function arrowHandlers(id: string) {
  const i = sectionOrder.indexOf(id);
  if (i === -1) return { moveUp: undefined, moveDown: undefined };
  return {
    moveUp: i > 0 ? () => moveSection(i, i - 1) : undefined,
    moveDown: i < sectionOrder.length - 1 ? () => moveSection(i, i + 1) : undefined,
  };
}
```

Then on the six main `SectionCard`s (Profil, Pengalaman, Pendidikan, Proyek, Organisasi, Kustom), add `{...arrowHandlers("summary")}`, `{...arrowHandlers("experience")}`, etc.

- [ ] **Step 5: Verify build + lint**

Run: `bun lint`
Expected: PASS.
Run: `bun build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add features/cv/components/panels/content-panel.tsx
git commit -m "feat(cv): add up/down reorder arrows to main section cards"
```

---

### Task 8: Template — classic

**Files:**
- Modify: `features/cv/components/templates/classic.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: classic renders main sections in user order; non-main after.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-section blocks**

Replace the whole region from the summary block through the custom block with a single ordered map. Keep each section's existing JSX verbatim inside a switch:

```tsx
{orderedMainSections(cv).map((id) => {
  switch (id) {
    case "summary":
      return cv.summary?.trim() ? (
        <Section title="Ringkasan">
          <p className="whitespace-pre-line text-[var(--cv-color-text)]">
            {cv.summary}
          </p>
        </Section>
      ) : null;
    case "experience":
      return cv.experience.length > 0 ? (
        <Section title="Pengalaman">
          <div className="space-y-3">
            {cv.experience.map((exp, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {exp.role || "Posisi"}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {exp.location}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[var(--cv-color-text)]">{exp.company}</p>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.description ? (
                  <HtmlContent
                    className="mt-1 text-[var(--cv-color-text)]"
                    html={exp.description}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null;
    case "education":
      return cv.education.length > 0 ? (
        <Section title="Pendidikan">
          <div className="space-y-3">
            {cv.education.map((edu, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {edu.school || "Institusi"}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {edu.location}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[var(--cv-color-text)]">
                    {join([edu.degree, edu.field], ", ")}
                  </p>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                {edu.gpa ? (
                  <p className="text-[0.85em] text-[var(--cv-color-text)]">
                    • IPK: {edu.gpa}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null;
    case "projects":
      return cv.projects.length > 0 ? (
        <Section title="Proyek">
          <div className="space-y-3">
            {cv.projects.map((proj, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {proj.name || "Proyek"}
                    {proj.type ? (
                      <span className="font-normal text-[var(--cv-color-text)]">
                        {" "}
                        — {proj.type}
                      </span>
                    ) : null}
                  </h3>
                  {proj.date ? (
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {proj.date}
                    </span>
                  ) : null}
                </div>
                {proj.skill ? (
                  <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {proj.skill}
                  </p>
                ) : null}
                {proj.description ? (
                  <HtmlContent
                    className="mt-0.5 text-[var(--cv-color-text)]"
                    html={proj.description}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null;
    case "organizations":
      return cv.organizations.length > 0 ? (
        <Section title="Organisasi">
          <div className="space-y-3">
            {cv.organizations.map((org, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {org.role || "Posisi"}
                    {org.name ? (
                      <span className="font-normal text-[var(--cv-color-text)]">
                        {" "}
                        — {org.name}
                      </span>
                    ) : null}
                  </h3>
                  {org.date ? (
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {org.date}
                    </span>
                  ) : null}
                </div>
                {org.description ? (
                  <HtmlContent
                    className="mt-1 text-[var(--cv-color-text)]"
                    html={org.description}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null;
    case "custom":
      return cv.custom.map((item, i) => (
        <Section key={`custom-${i}`} title={item.title || "Tambahan"}>
          {item.description ? (
            <HtmlContent
              className="mt-0.5 text-[var(--cv-color-text)]"
              html={item.description}
            />
          ) : null}
        </Section>
      ));
  }
})}
```

Note: custom maps over items, so it returns an array of sections (valid as a fragment child in React 19). Keep the existing non-main blocks (skills, interpersonal, languages, certifications) directly after this map, verbatim.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS. If Biome flags the switch exhaustiveness or the array-return-in-map, confirm the `switch` has all six cases and the map callback's inferred return type is `ReactNode` — fix by importing `type ReactNode` if needed.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/classic.tsx
git commit -m "feat(cv): classic template renders sections in user order"
```

---

### Task 9: Template — formal

**Files:**
- Modify: `features/cv/components/templates/formal.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: formal renders main sections in user order; non-main (skills+interpersonal+languages combined section) at the end.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-section blocks**

Formal's current order is: summary, education, experience, skills&languages, projects, certifications, organizations, custom. Main sections are summary, education, experience, projects, organizations, custom. Replace the summary/education/experience blocks and the projects/organizations/custom blocks with the ordered map. The `{hasSkillsAndLanguages ? <Section title="Keahlian & Bahasa">...}` block and the certifications block stay after the map, verbatim.

Use the same switch skeleton as classic (Task 8), but with formal's own markup for each section (matching the current file's classes and fields — e.g. formal projects also render `proj.skill`; education/experience markup as currently written). The `hasSkillsAndLanguages` variable stays as-is.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/formal.tsx
git commit -m "feat(cv): formal template renders sections in user order"
```

---

### Task 10: Template — minimal

**Files:**
- Modify: `features/cv/components/templates/minimal.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: minimal renders main sections in user order; non-main after.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-section blocks**

Replace summary/experience/education/projects/custom blocks with the ordered map using minimal's existing markup (Section wrapper with centered uppercase titles, `font-light` styling, current classes). Keep skills, interpersonal, languages, certifications blocks after, verbatim. Use the Task 8 switch skeleton with minimal's per-section JSX.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/minimal.tsx
git commit -m "feat(cv): minimal template renders sections in user order"
```

---

### Task 11: Template — professional

**Files:**
- Modify: `features/cv/components/templates/professional.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: professional renders main sections in user order; non-main after.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-section blocks**

Replace summary/experience/education/projects/organizations/custom blocks with the ordered map using professional's existing markup (Section with `inline-block border-b-2` titles). Keep skills, interpersonal, languages, certifications blocks after, verbatim. Use the Task 8 switch skeleton with professional's per-section JSX.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/professional.tsx
git commit -m "feat(cv): professional template renders sections in user order"
```

---

### Task 12: Template — elegant

**Files:**
- Modify: `features/cv/components/templates/elegant.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: elegant renders main sections in user order; non-main (skills+languages, certifications) after.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-section blocks**

Elegant's current order: summary, experience, education, skills+languages grid, certifications, projects, organizations, interpersonal, custom. Main sections: summary, experience, education, projects, organizations, custom. Replace those blocks with the ordered map using elegant's existing markup (centered Section with divider line). Keep the skills/languages grid, certifications, and interpersonal blocks after, verbatim. The skills+languages combined grid currently uses `[&>section]:mt-0` — keep that wrapper only around the two non-main sections after the map.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/elegant.tsx
git commit -m "feat(cv): elegant template renders sections in user order"
```

---

### Task 13: Template — executive

**Files:**
- Modify: `features/cv/components/templates/executive.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: executive renders main sections in user order; non-main after.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-section blocks**

Executive's current order: summary, experience, education, skills+languages grid, certifications, projects, organizations, interpersonal, custom. Main sections: summary, experience, education, projects, organizations, custom. Replace with the ordered map using executive's markup. Keep skills/languages grid, certifications, interpersonal after, verbatim.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/executive.tsx
git commit -m "feat(cv): executive template renders sections in user order"
```

---

### Task 14: Template — modern (two-column)

**Files:**
- Modify: `features/cv/components/templates/modern.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: modern renders main sections in user order in the main column; sidebar (skills, interpersonal, languages, certifications) unchanged.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-column blocks**

The sidebar `<aside>` keeps its SideSection blocks verbatim. In the right column `<div className="p-8">`, replace the summary/experience/projects/education/organizations/custom blocks with the ordered map using modern's markup (MainSection with accent `border-b` titles). Use the Task 8 switch skeleton with modern's per-section JSX. Order in the current file is summary, experience, projects, education, organizations, custom — all six main sections, so they all move into the map.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/modern.tsx
git commit -m "feat(cv): modern template renders sections in user order"
```

---

### Task 15: Template — creative (two-column)

**Files:**
- Modify: `features/cv/components/templates/creative.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: creative renders main sections in user order in the main column; sidebar unchanged.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-column blocks**

Sidebar `<aside>` stays verbatim. In the right column, replace summary/experience/projects/education/organizations/custom blocks with the ordered map using creative's markup (MainSection with `border-b-2` accent titles). Current order: summary, experience, projects, education, organizations, custom.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/creative.tsx
git commit -m "feat(cv): creative template renders sections in user order"
```

---

### Task 16: Template — compact (two-column)

**Files:**
- Modify: `features/cv/components/templates/compact.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: compact renders main sections in user order in the main column; sidebar unchanged.

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Replace the main-column blocks**

Sidebar `<aside>` keeps its SideSection blocks verbatim. In the main column, replace summary/experience/education/projects/custom blocks with the ordered map using compact's markup (MainSection with `border-b` titles). Current order: summary, experience, education, projects, custom.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/compact.tsx
git commit -m "feat(cv): compact template renders sections in user order"
```

---

### Task 17: Template — fresh-graduate (becomes single-column)

**Files:**
- Modify: `features/cv/components/templates/fresh-graduate.tsx`

**Interfaces:**
- Consumes: `orderedMainSections` from `./shared`.
- Produces: fresh-graduate renders main sections in user order in one column; non-main after. Loses its two-column education-left/experience-right split (spec decision: uniform pattern across all templates).

- [ ] **Step 1: Import the helper**

```ts
import { CvPage, formatDateRange, join, orderedMainSections, type TemplateProps } from "./shared";
```

- [ ] **Step 2: Collapse the two-column grid into one column**

Remove the `<div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 print:grid-cols-2">` wrapper and both inner `<div>` columns. Render:

1. Summary (Section title "About Me") — part of the ordered map.
2. The ordered map for main sections using fresh-graduate's markup (education, experience, projects, organizations, custom).
3. After the map: skills, interpersonal, languages, certifications — in fresh-graduate's existing markup, each as a Section.

Note: this changes the header subtitle copy only if it referenced the two-column layout; otherwise keep it. The `Section` component and all section markup stay verbatim.

- [ ] **Step 3: Run lint**

Run: `bun lint`
Expected: PASS.

- [ ] **Step 4: Verify build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/templates/fresh-graduate.tsx
git commit -m "feat(cv): fresh-graduate template renders sections in user order"
```

---

### Task 18: Full verification

**Files:**
- None (verification only).

- [ ] **Step 1: Run all unit tests**

Run: `bun test features/cv/lib/cv-content.test.ts features/cv/stores/__tests__/section-order-store.test.ts features/cv/components/templates/__tests__/ordered-main-sections.test.ts`
Expected: all PASS.

- [ ] **Step 2: Run lint**

Run: `bun lint`
Expected: PASS, no warnings.

- [ ] **Step 3: Run build**

Run: `bun build`
Expected: PASS.

- [ ] **Step 4: Manual smoke check**

Run `bun dev`, open a CV, go to the Konten panel, click the up arrow on "Proyek" and verify the preview reorders projects above education. Switch templates and confirm each renders the same order. Verify PDF export still paginates (section items keep `data-entry`).

- [ ] **Step 5: Final commit (if any stragglers)**

```bash
git add -A
git commit -m "chore(cv): section reorder verification cleanup"
```

---

## Self-Review Notes

- **Spec coverage:** schema (T1), store (T2), Prisma (T3), read path `toCvContent`/router (T4), shared helper (T5), live preview (T6), UI arrows (T7), all 10 templates (T8–T17), verification (T18). Out-of-scope items (sidebar reorder, drag reorder, per-template order) intentionally not planned.
- **Defensive fallback:** `orderedMainSections` defaults on missing/unknown ids (T5 Step 3) and `toCvContent`/router default on missing field (T4), covering dashboard thumbnails and `getById` consumers that cast raw rows to `CvContent`.
- **Custom title header behavior** (each custom item = its own section titled by `item.title`) is preserved in every template's `custom` switch case.
- **Non-main placement** after all main sections matches the approved spec decision; two-column templates keep sidebar sections fixed.
- **Type consistency:** `MainSectionId` and `DEFAULT_SECTION_ORDER` names are used identically across T1–T6; `orderedMainSections` signature `(cv: CvContent) => MainSectionId[]` is stable.
