import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Classic ATS-friendly CV template. Single column, semantic headings, no
 * multi-column tricks that break ATS parsers. Rendered from live CV content.
 *
 * Colors come from the `--cv-color-*` CSS vars set on the preview wrapper.
 */
export function ClassicTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <article className="mx-auto w-full max-w-[794px] bg-[var(--cv-color-bg)] p-10 text-[var(--cv-color-text)] shadow-sm print:[print-color-adjust:exact]">
      <header className="border-b border-[var(--cv-color-accent)] pb-4">
        <h1 className="text-[1.6em] font-bold tracking-tight text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-0.5 text-[0.92em] text-[var(--cv-color-text)] opacity-80">
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
        <Section title="Summary">
          <p className="whitespace-pre-line text-[var(--cv-color-text)]">
            {cv.summary}
          </p>
        </Section>
      ) : null}

      {cv.experience.length > 0 ? (
        <Section title="Experience">
          <div className="space-y-3">
            {cv.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {exp.role || "Role"}
                    {exp.company ? (
                      <span className="font-normal text-[var(--cv-color-text)]">
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
                  <p className="mt-1 whitespace-pre-line text-[var(--cv-color-text)]">
                    {exp.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.education.length > 0 ? (
        <Section title="Education">
          <div className="space-y-3">
            {cv.education.map((edu, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {edu.school || "School"}
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

      {cv.skills.length > 0 ? (
        <Section title="Skills">
          <p className="text-[var(--cv-color-text)]">
            {join(
              cv.skills.map((s) => s.name),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.interpersonal.length > 0 ? (
        <Section title="Interpersonal Skills">
          <p className="text-[var(--cv-color-text)]">
            {join(
              cv.interpersonal.map((s) => s.name),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.languages.length > 0 ? (
        <Section title="Languages">
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
        <Section title="Projects">
          <div className="space-y-3">
            {cv.projects.map((proj, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {proj.name || "Project"}
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
        <Section title="Certifications">
          <div className="space-y-2">
            {cv.certifications.map((cert, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {cert.name || "Certification"}
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
        <Section title="Organizations">
          <div className="space-y-3">
            {cv.organizations.map((org, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-[var(--cv-color-heading)]">
                    {org.role || "Role"}
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
        <Section title="Additional">
          <div className="space-y-3">
            {cv.custom.map((item, i) => (
              <div key={i}>
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
    </article>
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
