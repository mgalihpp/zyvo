import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Minimal single-column template. Centered header, generous whitespace, thin
 * rules. ATS-safe (single column, semantic headings, real text).
 *
 * Colors come from the `--cv-color-*` CSS vars set on the preview wrapper.
 */
export function MinimalTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location, p.website]);
  const linkLine = join([p.linkedin, p.github]);

  return (
    <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] p-12 font-light text-[var(--cv-color-text)] shadow-sm print:[print-color-adjust:exact]">
      <header className="text-center">
        <h1 className="text-[2em] font-normal tracking-[0.1em] text-[var(--cv-color-heading)] uppercase font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-[0.92em] tracking-wide text-[var(--cv-color-text)] opacity-70">
            {p.headline}
          </p>
        ) : null}
        {contactLine ? (
          <p className="mt-3 text-[0.85em] text-[var(--cv-color-text)] opacity-70">
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
        <Section title="Profile">
          <p className="whitespace-pre-line">{cv.summary}</p>
        </Section>
      ) : null}

      {cv.experience.length > 0 ? (
        <Section title="Experience">
          <div className="space-y-4">
            {cv.experience.map((exp, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-[var(--cv-color-heading)]">
                    {join([exp.role, exp.company], ", ") || "Role"}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-60">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.location ? (
                  <p className="text-[0.85em] text-[var(--cv-color-text)] opacity-60">
                    {exp.location}
                  </p>
                ) : null}
                {exp.description ? (
                  <p className="mt-1 whitespace-pre-line">{exp.description}</p>
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
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-[var(--cv-color-heading)]">
                    {edu.school || "School"}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-60">
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                <p>
                  {join([edu.degree, edu.field], ", ")}
                  {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.projects.length > 0 ? (
        <Section title="Projects">
          <div className="space-y-3">
            {cv.projects.map((proj, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-[var(--cv-color-heading)]">
                    {proj.name || "Project"}
                  </h3>
                  {proj.date ? (
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-60">
                      {proj.date}
                    </span>
                  ) : null}
                </div>
                {proj.description ? (
                  <p className="mt-0.5 whitespace-pre-line">
                    {proj.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.skills.length > 0 ? (
        <Section title="Skills">
          <p>
            {join(
              cv.skills.map((s) => s.name),
              "  ·  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.interpersonal.length > 0 ? (
        <Section title="Interpersonal Skills">
          <p>
            {join(
              cv.interpersonal.map((s) => s.name),
              "  ·  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.languages.length > 0 ? (
        <Section title="Languages">
          <p>
            {join(
              cv.languages.map((l) =>
                l.level?.trim() ? `${l.name} (${l.level})` : l.name,
              ),
              "  ·  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.certifications.length > 0 ? (
        <Section title="Certifications">
          <div className="space-y-1">
            {cv.certifications.map((c, i) => (
              <p key={i}>
                <span className="font-medium text-[var(--cv-color-heading)]">
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
        <Section title="Organizations">
          <div className="space-y-3">
            {cv.organizations.map((org, i) => (
              <div key={i} data-entry>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-[var(--cv-color-heading)]">
                    {join([org.role, org.name], ", ") || "Organization"}
                  </h3>
                  {org.date ? (
                    <span className="shrink-0 text-[0.85em] text-[var(--cv-color-text)] opacity-60">
                      {org.date}
                    </span>
                  ) : null}
                </div>
                {org.description ? (
                  <p className="mt-0.5 whitespace-pre-line">
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
              <div key={i} data-entry>
                <h3 className="font-medium text-[var(--cv-color-heading)]">
                  {item.title || "Item"}
                </h3>
                {item.description ? (
                  <p className="mt-0.5 whitespace-pre-line">
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
    <section className="mt-6">
      <h2 className="mb-3 text-center text-[0.7em] font-normal uppercase tracking-[0.25em] text-[var(--cv-color-accent)] opacity-80 font-[family-name:var(--cv-font-heading)]">
        <span className="inline-block border-t border-[var(--cv-color-accent)] pt-2 opacity-100">
          {title}
        </span>
      </h2>
      {children}
    </section>
  );
}
