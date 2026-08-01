import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Fresh-graduate template. Leads with education and skills (what a new grad has
 * most of) before experience. Two-column body on wide screens; collapses to one
 * column on narrow viewports. Warm accent for a friendly, entry-level tone.
 *
 * Colors come from the `--cv-color-*` CSS vars set on the preview wrapper.
 */
export function FreshGraduateTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <CvPage className="p-10">
      <header className="border-b-2 border-[var(--cv-color-accent)] pb-4">
        <h1 className="text-[1.6em] font-bold tracking-tight text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Nama Anda"}
        </h1>
        {p.headline ? (
          <p className="mt-0.5 text-[0.92em] font-medium text-[var(--cv-color-accent)]">
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
        <Section title="About Me">
          <p className="whitespace-pre-line text-[var(--cv-color-text)]">
            {cv.summary}
          </p>
        </Section>
      ) : null}

      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 print:grid-cols-2">
        <div>
          {cv.education.length > 0 ? (
            <Section title="Pendidikan">
              <div className="space-y-3">
                {cv.education.map((edu, i) => (
                  <div key={i} data-entry>
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {edu.school || "Institusi"}
                    </h3>
                    <p className="text-[var(--cv-color-text)]">
                      {join([edu.degree, edu.field], ", ")}
                    </p>
                    <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {formatDateRange(edu.startDate, edu.endDate)}
                      {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {cv.skills.length > 0 ? (
            <Section title="Keahlian">
              <div className="flex flex-wrap gap-1.5">
                {cv.skills
                  .filter((s) => s.name.trim())
                  .map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[var(--cv-color-accent)]/15 px-2.5 py-0.5 text-[0.85em] text-[var(--cv-color-accent)] print:[print-color-adjust:exact]"
                    >
                      {s.name}
                    </span>
                  ))}
              </div>
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
              <ul className="space-y-0.5 text-[var(--cv-color-text)]">
                {cv.languages
                  .filter((l) => l.name.trim())
                  .map((l, i) => (
                    <li key={i}>
                      {l.level?.trim() ? `${l.name} — ${l.level}` : l.name}
                    </li>
                  ))}
              </ul>
            </Section>
          ) : null}

          {cv.certifications.length > 0 ? (
            <Section title="Sertifikasi">
              <div className="space-y-1">
                {cv.certifications.map((c, i) => (
                  <p key={i}>
                    <span className="font-semibold text-[var(--cv-color-heading)]">
                      {c.name}
                    </span>
                    {join([c.issuer, c.date])
                      ? ` — ${join([c.issuer, c.date])}`
                      : ""}
                  </p>
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        <div>
          {cv.experience.length > 0 ? (
            <Section title="Pengalaman">
              <div className="space-y-3">
                {cv.experience.map((exp, i) => (
                  <div key={i} data-entry>
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {exp.role || "Posisi"}
                    </h3>
                    <p className="text-[0.85em] font-medium text-[var(--cv-color-text)] opacity-80">
                      {join([exp.company, exp.location])}
                    </p>
                    <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </p>
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

          {cv.projects.length > 0 ? (
            <Section title="Proyek">
              <div className="space-y-3">
                {cv.projects.map((proj, i) => (
                  <div key={i} data-entry>
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {proj.name || "Proyek"}
                    </h3>
                    {proj.date ? (
                      <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                        {proj.date}
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

          {cv.organizations.length > 0 ? (
            <Section title="Organisasi">
              <div className="space-y-3">
                {cv.organizations.map((org, i) => (
                  <div key={i} data-entry>
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {join([org.role, org.name], " — ") || "Organisasi"}
                    </h3>
                    {org.date ? (
                      <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                        {org.date}
                      </p>
                    ) : null}
                    {org.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[var(--cv-color-text)]">
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
        </div>
      </div>
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
      <h2 className="mb-2 text-[0.85em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
