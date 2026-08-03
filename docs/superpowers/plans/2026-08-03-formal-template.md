# Formal CV Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new free "Formal" CV template — single-column, serif, centered header, full-width section dividers.

**Architecture:** Create `formal.tsx` template component following existing patterns, then register it in 3 files (index.ts, eager.ts, template-colors.ts).

**Tech Stack:** React, Tailwind CSS, existing template infrastructure (CvPage, formatDateRange, join, TemplateProps)

## Global Constraints

- Follow existing template conventions exactly (CvPage wrapper, data-entry attrs, CSS vars, conditional rendering)
- All colors via `--cv-color-*` CSS vars, no hardcoded colors
- Biome v2 formatting (`bun lint`)
- Seriffonts: Lora (body) + Merriweather (heading)

---

### Task 1: Create `formal.tsx` template component

**Files:**
- Create: `features/cv/components/templates/formal.tsx`

**Interfaces:**
- Consumes: `CvPage`, `formatDateRange`, `join`, `TemplateProps` from `./shared`
- Produces: `FormalTemplate` named export

- [ ] **Step 1: Create the template file**

```tsx
import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Formal single-column CV template. Centered header, serif typography,
 * full-width section dividers. ATS-safe.
 *
 * Colors come from the `--cv-color-*` CSS vars set on the preview wrapper.
 */
export function FormalTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <CvPage className="p-10">
      <header className="text-center">
        <h1 className="text-[1.8em] font-bold text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Nama Anda"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-[0.92em] text-[var(--cv-color-text)] opacity-80">
            {p.headline}
          </p>
        ) : null}
        {contactLine ? (
          <p className="mt-2 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
            {contactLine}
          </p>
        ) : null}
        {linkLine ? (
          <p className="mt-1 text-[0.85em] text-[var(--cv-color-link)]">
            {linkLine}
          </p>
        ) : null}
      </header>

      {cv.summary?.trim() ? (
        <Section title="Profil">
          <p className="whitespace-pre-line text-[var(--cv-color-text)]">
            {cv.summary}
          </p>
        </Section>
      ) : null}

      {cv.education.length > 0 ? (
        <Section title="Pendidikan">
          <div className="space-y-3">
            {cv.education.map((edu, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {edu.school || "Institusi"}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {edu.location ? `${edu.location}  ` : ""}
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                <p className="text-[var(--cv-color-text)]">
                  {join([edu.degree, edu.field], ", ")}
                  {edu.gpa ? `  •  IPK: ${edu.gpa}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.experience.length > 0 ? (
        <Section title="Pengalaman">
          <div className="space-y-3">
            {cv.experience.map((exp, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {exp.role || "Posisi"}
                    {exp.company ? (
                      <span className="font-normal text-[var(--cv-color-text)]">
                        {" "}
                        — {exp.company}
                      </span>
                    ) : null}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                    {exp.location ? `${exp.location}  ` : ""}
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.description ? (
                  <p className="mt-1 whitespace-pre-line text-[var(--cv-color-text)]">
                    {exp.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.skills.length > 0 ? (
        <Section title="Keahlian">
          <p className="text-[var(--cv-color-text)]">
            {join(
              cv.skills.map((s) =>
                s.level && s.level !== 3
                  ? `${s.name} (${s.level}/5)`
                  : s.name,
              ),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.interpersonal.length > 0 ? (
        <Section title="Keahlian Interpersonal">
          <p className="text-[var(--cv-color-text)]">
            {join(
              cv.interpersonal.map((s) => s.name),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.languages.length > 0 ? (
        <Section title="Bahasa">
          <p className="text-[var(--cv-color-text)]">
            {join(
              cv.languages.map((l) =>
                l.level?.trim() ? `${l.name} (${l.level})` : l.name,
              ),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.projects.length > 0 ? (
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
                  <p className="mt-0.5 whitespace-pre-line text-[var(--cv-color-text)]">
                    {proj.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.certifications.length > 0 ? (
        <Section title="Sertifikasi">
          <div className="space-y-2">
            {cv.certifications.map((cert, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {cert.name || "Sertifikasi"}
                    {cert.issuer ? (
                      <span className="font-normal text-[var(--cv-color-text)]">
                        {" "}
                        — {cert.issuer}
                      </span>
                    ) : null}
                  </h3>
                  {cert.date ? (
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {cert.date}
                    </span>
                  ) : null}
                </div>
                {cert.url ? (
                  <p className="text-[0.85em] text-[var(--cv-color-link)]">
                    {cert.url}
                  </p>
                ) : null}
                {cert.description ? (
                  <p className="mt-0.5 whitespace-pre-line text-[var(--cv-color-text)]">
                    {cert.description}
                  </p>
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
                  <p className="mt-1 whitespace-pre-line text-[var(--cv-color-text)]">
                    {org.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.custom.length > 0 ? (
        <Section title="Tambahan">
          <div className="space-y-3">
            {cv.custom.map((item, i) => (
              <div key={i} data-entry>
                <h3 className="font-semibold text-[var(--cv-color-heading)]">
                  {item.title || "Item"}
                </h3>
                {item.description ? (
                  <p className="mt-0.5 whitespace-pre-line text-[var(--cv-color-text)]">
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </CvPage>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-[0.85em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] border-b border-[var(--cv-color-accent)] pb-1 font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `bun lint`
Expected: No errors

---

### Task 2: Register lazy import in `index.ts`

**Files:**
- Modify: `features/cv/components/templates/index.ts:9-37` (lazy imports) and `:39-109` (TEMPLATES array)

**Interfaces:**
- Consumes: `FormalTemplate` from `./formal`
- Produces: `FormalLazy` + entry in `TEMPLATES` array

- [ ] **Step 1: Add lazy import after CompactLazy (line ~37)**

```tsx
const FormalLazy = lazy(() =>
  import("./formal").then((m) => ({ default: m.FormalTemplate })),
);
```

- [ ] **Step 2: Add TEMPLATES entry after compact (line ~108)**

```tsx
{
  id: "formal",
  name: "Formal",
  description: "Single-column formal layout with serif fonts & section dividers.",
  categories: ["ats", "professional", "one-column"],
  lazyComponent: FormalLazy,
},
```

- [ ] **Step 3: Verify registration**

Run: `bun lint`
Expected: No errors

---

### Task 3: Register eager import in `eager.ts`

**Files:**
- Modify: `features/cv/components/templates/eager.ts:2-12` (imports) and `:21-31` (EAGER_TEMPLATES)

**Interfaces:**
- Consumes: `FormalTemplate` from `./formal`
- Produces: Entry in `EAGER_TEMPLATES` map

- [ ] **Step 1: Add import**

```tsx
import { FormalTemplate } from "./formal";
```

- [ ] **Step 2: Add entry to EAGER_TEMPLATES**

```tsx
formal: FormalTemplate,
```

- [ ] **Step 3: Verify**

Run: `bun lint`
Expected: No errors

---

### Task 4: Register default colors & fonts in `template-colors.ts`

**Files:**
- Modify: `features/cv/components/templates/template-colors.ts:10-83` (TEMPLATE_DEFAULT_COLORS) and `:97-110` (TEMPLATE_DEFAULT_FONTS)

**Interfaces:**
- Consumes: `CvColors`, `Typography` types from schema
- Produces: Default palette + font pairing for `"formal"` key

- [ ] **Step 1: Add default colors entry**

```tsx
formal: {
  presetId: "neutral",
  background: "#ffffff",
  heading: "#1a1a2e",
  text: "#333333",
  link: "#1a1a2e",
  accent: "#1a1a2e",
},
```

- [ ] **Step 2: Add default fonts entry**

```tsx
formal: { fontHeading: "lora", fontBody: "lora" },
```

- [ ] **Step 3: Verify**

Run: `bun lint`
Expected: No errors

---

### Task 5: Final verification

- [ ] **Step 1: Run full lint**

Run: `bun lint`
Expected: Clean pass

- [ ] **Step 2: Run dev server and check template picker**

Run: `bun dev`
Expected: "Formal" appears in template picker, renders correctly with sample data

- [ ] **Step 3: Commit all changes**

```bash
git add features/cv/components/templates/formal.tsx features/cv/components/templates/index.ts features/cv/components/templates/eager.ts features/cv/components/templates/template-colors.ts
git commit -m "feat: add Formal CV template"
```
