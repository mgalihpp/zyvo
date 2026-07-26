import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Minimal single-column template. Centered header, generous whitespace, thin
 * rules. ATS-safe (single column, semantic headings, real text).
 */
export function MinimalTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location, p.website]);
  const linkLine = join([p.linkedin, p.github]);

  return (
    <article className="mx-auto w-full max-w-[794px] bg-white p-12 text-[13px] font-light leading-relaxed text-neutral-700 shadow-sm">
      <header className="text-center">
        <h1 className="text-3xl font-normal tracking-[0.1em] text-neutral-900 uppercase">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-sm tracking-wide text-neutral-500">
            {p.headline}
          </p>
        ) : null}
        {contactLine ? (
          <p className="mt-3 text-xs text-neutral-500">{contactLine}</p>
        ) : null}
        {linkLine ? (
          <p className="mt-1 text-xs text-neutral-500">{linkLine}</p>
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
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-neutral-900">
                    {join([exp.role, exp.company], ", ") || "Role"}
                  </h3>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.location ? (
                  <p className="text-xs text-neutral-400">{exp.location}</p>
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
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-neutral-900">
                    {edu.school || "School"}
                  </h3>
                  <span className="shrink-0 text-xs text-neutral-400">
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
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-neutral-900">
                    {proj.name || "Project"}
                  </h3>
                  {proj.date ? (
                    <span className="shrink-0 text-xs text-neutral-400">
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
                <span className="font-medium text-neutral-900">{c.name}</span>
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
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-neutral-900">
                    {join([org.role, org.name], ", ") || "Organization"}
                  </h3>
                  {org.date ? (
                    <span className="shrink-0 text-xs text-neutral-400">
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
              <div key={i}>
                <h3 className="font-medium text-neutral-900">
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
      <h2 className="mb-3 text-center text-[0.7rem] font-normal uppercase tracking-[0.25em] text-neutral-400">
        <span className="inline-block border-t border-neutral-300 pt-2">
          {title}
        </span>
      </h2>
      {children}
    </section>
  );
}
