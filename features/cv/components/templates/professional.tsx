import { HtmlContent } from "@/features/cv/components/html-content";
import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Professional template. A colored header band with the name and contact
 * details, then a single narrative column with accent-underlined headings.
 * Single column keeps it ATS-parseable while still reading as "designed".
 *
 * Colors come from the `--cv-color-*` CSS vars set on the preview wrapper; the
 * accent band uses `--cv-color-on-accent` (derived readable text color).
 */
export function ProfessionalTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <CvPage>
      <header className="bg-[var(--cv-color-accent)] px-10 py-8 text-[var(--cv-color-on-accent)] print:[print-color-adjust:exact]">
        <h1 className="text-[1.6em] font-bold tracking-tight font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Nama Anda"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-[0.92em] opacity-80">{p.headline}</p>
        ) : null}
        {contactLine ? (
          <p className="mt-3 text-[0.85em] opacity-80">{contactLine}</p>
        ) : null}
        {linkLine ? (
          <p className="mt-1 text-[0.85em] opacity-80">{linkLine}</p>
        ) : null}
      </header>

      <div className="px-10 py-8">
        {cv.summary?.trim() ? (
          <Section title="Ringkasan">
            <p className="whitespace-pre-line text-[var(--cv-color-text)]">
              {cv.summary}
            </p>
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
                        <span className="font-normal text-[var(--cv-color-accent)]">
                          {" "}
                          — {exp.company}
                        </span>
                      ) : null}
                    </h3>
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  </div>
                  {exp.location ? (
                    <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-70">
                      {exp.location}
                    </p>
                  ) : null}
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
        ) : null}

        {cv.skills.length > 0 ? (
          <Section title="Keahlian">
            <div className="flex flex-wrap gap-1.5">
              {cv.skills
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <span
                    key={i}
                    className="rounded bg-[var(--cv-color-accent)]/15 px-2 py-0.5 text-[0.85em] text-[var(--cv-color-accent)] print:[print-color-adjust:exact]"
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
                    <HtmlContent
                      className="mt-1 text-[var(--cv-color-text)]"
                      html={org.description}
                    />
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
                    <HtmlContent
                      className="mt-0.5 text-[var(--cv-color-text)]"
                      html={item.description}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
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
    <section className="mt-5 first:mt-0">
      <h2 className="mb-2 inline-block border-b-2 border-[var(--cv-color-accent)] pb-0.5 text-[0.85em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
