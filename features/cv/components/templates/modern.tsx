import { MODERN_PAGE_BACKGROUND } from "./page-backgrounds";
import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Modern two-column template. A tinted left sidebar holds contact details,
 * skills, languages and certifications; the wider right column holds the
 * narrative sections (summary, experience, education, projects).
 *
 * The two columns collapse to a single column on narrow viewports so the
 * preview stays readable on phones; print/PDF keeps the two-column layout.
 *
 * Colors come from the `--cv-color-*` CSS vars set on the preview wrapper. The
 * accent sidebar uses `--cv-color-on-accent` (derived readable text color).
 */
export function ModernTemplate({ cv }: TemplateProps) {
  const p = cv.personal;

  return (
    <CvPage
      className="grid grid-cols-1 sm:grid-cols-[34%_1fr] sm:grid-rows-[1fr] print:grid-cols-[34%_1fr] print:grid-rows-[1fr]"
      style={{ background: MODERN_PAGE_BACKGROUND }}
    >
      <aside className="p-6 text-[var(--cv-color-on-accent)]">
        <h1 className="text-[1.35em] font-bold leading-tight font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Nama Anda"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-[0.92em] opacity-70">{p.headline}</p>
        ) : null}

        <SideSection title="Kontak">
          <ul className="space-y-1 break-words text-[0.85em] opacity-85">
            {p.email ? <li>{p.email}</li> : null}
            {p.phone ? <li>{p.phone}</li> : null}
            {p.location ? <li>{p.location}</li> : null}
            {p.website ? <li>{p.website}</li> : null}
            {p.linkedin ? <li>{p.linkedin}</li> : null}
            {p.github ? <li>{p.github}</li> : null}
          </ul>
        </SideSection>

        {cv.skills.length > 0 ? (
          <SideSection title="Keahlian">
            <ul className="space-y-1.5">
              {cv.skills
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <li key={i}>
                    <span className="text-[0.85em] opacity-90">{s.name}</span>
                    <span
                      className="mt-1 flex h-1 overflow-hidden rounded-full bg-[var(--cv-color-on-accent)]/25"
                      aria-hidden
                    >
                      <span
                        className="h-full rounded-full bg-[var(--cv-color-on-accent)]/80"
                        // level 5 (expert) = 100%, 1 (beginner) = 20%
                        style={{ width: `${(s.level / 5) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
            </ul>
          </SideSection>
        ) : null}

        {cv.interpersonal.length > 0 ? (
          <SideSection title="Keahlian Interpersonal">
            <p className="text-[0.85em] opacity-85">
              {join(
                cv.interpersonal.map((s) => s.name),
                ", ",
              )}
            </p>
          </SideSection>
        ) : null}

        {cv.languages.length > 0 ? (
          <SideSection title="Bahasa">
            <ul className="space-y-1 text-[0.85em] opacity-85">
              {cv.languages
                .filter((l) => l.name.trim())
                .map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{l.name}</span>
                    {l.level ? (
                      <span className="opacity-70">{l.level}</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </SideSection>
        ) : null}

        {cv.certifications.length > 0 ? (
          <SideSection title="Sertifikasi">
            <ul className="space-y-2 text-[0.85em] opacity-85">
              {cv.certifications.map((c, i) => (
                <li key={i}>
                  <p className="font-medium opacity-100">{c.name}</p>
                  {join([c.issuer, c.date]) ? (
                    <p className="opacity-70">{join([c.issuer, c.date])}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SideSection>
        ) : null}
      </aside>

      <div className="p-8">
        {cv.summary?.trim() ? (
          <MainSection title="Profil">
            <p className="whitespace-pre-line text-[var(--cv-color-text)]">
              {cv.summary}
            </p>
          </MainSection>
        ) : null}

        {cv.experience.length > 0 ? (
          <MainSection title="Pengalaman">
            <div className="space-y-3">
              {cv.experience.map((exp, i) => (
                <div key={i} data-entry>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {exp.role || "Posisi"}
                    </h3>
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  </div>
                  <p className="text-[0.85em] font-medium text-[var(--cv-color-text)] opacity-80">
                    {join([exp.company, exp.location])}
                  </p>
                  {exp.description ? (
                    <p className="mt-1 whitespace-pre-line text-[var(--cv-color-text)]">
                      {exp.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </MainSection>
        ) : null}

        {cv.projects.length > 0 ? (
          <MainSection title="Proyek">
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
                  {proj.description ? (
                    <p className="mt-0.5 whitespace-pre-line text-[var(--cv-color-text)]">
                      {proj.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </MainSection>
        ) : null}

        {cv.education.length > 0 ? (
          <MainSection title="Pendidikan">
            <div className="space-y-3">
              {cv.education.map((edu, i) => (
                <div key={i} data-entry>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {edu.school || "Institusi"}
                    </h3>
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {formatDateRange(edu.startDate, edu.endDate)}
                    </span>
                  </div>
                  <p className="text-[var(--cv-color-text)]">
                    {join([edu.degree, edu.field], ", ")}
                    {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </MainSection>
        ) : null}

        {cv.organizations.length > 0 ? (
          <MainSection title="Organisasi">
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
          </MainSection>
        ) : null}

        {cv.custom.length > 0 ? (
          <MainSection title="Tambahan">
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
          </MainSection>
        ) : null}
      </div>
    </CvPage>
  );
}

function SideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-[0.65em] font-bold uppercase tracking-widest opacity-60 font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MainSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="mb-2 border-b border-[var(--cv-color-accent)]/30 pb-1 text-[0.85em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
