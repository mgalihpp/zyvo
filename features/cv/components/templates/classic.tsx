import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Classic ATS-friendly CV template. Single column, semantic headings, no
 * multi-column tricks that break ATS parsers. Rendered from live CV content.
 */
export function ClassicTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <article className="mx-auto w-full max-w-[794px] bg-white p-10 text-neutral-800 shadow-sm">
      <header className="border-b border-neutral-300 pb-4">
        <h1 className="text-[1.6em] font-bold tracking-tight text-neutral-900 font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-0.5 text-[0.92em] text-neutral-600">{p.headline}</p>
        ) : null}
        {contactLine ? (
          <p className="mt-2 text-[0.85em] text-neutral-600">{contactLine}</p>
        ) : null}
        {linkLine ? (
          <p className="mt-1 text-[0.85em] text-neutral-600">{linkLine}</p>
        ) : null}
      </header>

      {cv.summary?.trim() ? (
        <Section title="Summary">
          <p className="whitespace-pre-line text-neutral-700">{cv.summary}</p>
        </Section>
      ) : null}

      {cv.experience.length > 0 ? (
        <Section title="Experience">
          <div className="space-y-3">
            {cv.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold text-neutral-900">
                    {exp.role || "Role"}
                    {exp.company ? (
                      <span className="font-normal text-neutral-700">
                        {" "}
                        — {exp.company}
                      </span>
                    ) : null}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-neutral-500">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                {exp.location ? (
                  <p className="text-[0.85em] text-neutral-500">
                    {exp.location}
                  </p>
                ) : null}
                {exp.description ? (
                  <p className="mt-1 whitespace-pre-line text-neutral-700">
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
                  <h3 className="font-semibold text-neutral-900">
                    {edu.school || "School"}
                  </h3>
                  <span className="shrink-0 text-[0.85em] text-neutral-500">
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                <p className="text-neutral-700">
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
          <p className="text-neutral-700">
            {join(
              cv.skills.map((s) => s.name),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.interpersonal.length > 0 ? (
        <Section title="Interpersonal Skills">
          <p className="text-neutral-700">
            {join(
              cv.interpersonal.map((s) => s.name),
              "  •  ",
            )}
          </p>
        </Section>
      ) : null}

      {cv.languages.length > 0 ? (
        <Section title="Languages">
          <p className="text-neutral-700">
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
                  <h3 className="font-semibold text-neutral-900">
                    {proj.name || "Project"}
                    {proj.type ? (
                      <span className="font-normal text-neutral-700">
                        {" "}
                        — {proj.type}
                      </span>
                    ) : null}
                  </h3>
                  {proj.date ? (
                    <span className="shrink-0 text-[0.85em] text-neutral-500">
                      {proj.date}
                    </span>
                  ) : null}
                </div>
                {proj.skill ? (
                  <p className="text-[0.85em] text-neutral-500">{proj.skill}</p>
                ) : null}
                {proj.description ? (
                  <p className="mt-0.5 whitespace-pre-line text-neutral-700">
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
                  <h3 className="font-semibold text-neutral-900">
                    {cert.name || "Certification"}
                    {cert.issuer ? (
                      <span className="font-normal text-neutral-700">
                        {" "}
                        — {cert.issuer}
                      </span>
                    ) : null}
                  </h3>
                  {cert.date ? (
                    <span className="shrink-0 text-[0.85em] text-neutral-500">
                      {cert.date}
                    </span>
                  ) : null}
                </div>
                {cert.url ? (
                  <p className="text-[0.85em] text-neutral-500">{cert.url}</p>
                ) : null}
                {cert.description ? (
                  <p className="mt-0.5 whitespace-pre-line text-neutral-700">
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
                  <h3 className="font-semibold text-neutral-900">
                    {org.role || "Role"}
                    {org.name ? (
                      <span className="font-normal text-neutral-700">
                        {" "}
                        — {org.name}
                      </span>
                    ) : null}
                  </h3>
                  {org.date ? (
                    <span className="shrink-0 text-[0.85em] text-neutral-500">
                      {org.date}
                    </span>
                  ) : null}
                </div>
                {org.description ? (
                  <p className="mt-1 whitespace-pre-line text-neutral-700">
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
                <h3 className="font-semibold text-neutral-900">
                  {item.title || "Item"}
                </h3>
                {item.description ? (
                  <p className="mt-0.5 whitespace-pre-line text-neutral-700">
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
      <h2 className="mb-2 text-[0.85em] font-bold uppercase tracking-widest text-neutral-500 font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
