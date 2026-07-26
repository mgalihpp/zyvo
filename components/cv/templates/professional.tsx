import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Professional template. A colored header band with the name and contact
 * details, then a single narrative column with accent-underlined headings.
 * Single column keeps it ATS-parseable while still reading as "designed".
 */
export function ProfessionalTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <article className="mx-auto w-full max-w-[794px] bg-white text-[13px] leading-relaxed text-neutral-800 shadow-sm">
      <header className="bg-sky-800 px-10 py-8 text-white print:[print-color-adjust:exact]">
        <h1 className="text-2xl font-bold tracking-tight">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-sm text-sky-100">{p.headline}</p>
        ) : null}
        {contactLine ? (
          <p className="mt-3 text-xs text-sky-100">{contactLine}</p>
        ) : null}
        {linkLine ? (
          <p className="mt-1 text-xs text-sky-100">{linkLine}</p>
        ) : null}
      </header>

      <div className="px-10 py-8">
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
                        <span className="font-normal text-sky-800">
                          {" "}
                          — {exp.company}
                        </span>
                      ) : null}
                    </h3>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  </div>
                  {exp.location ? (
                    <p className="text-xs text-neutral-500">{exp.location}</p>
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
                    <span className="shrink-0 text-xs text-neutral-500">
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

        {cv.projects.length > 0 ? (
          <Section title="Projects">
            <div className="space-y-3">
              {cv.projects.map((proj, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-neutral-900">
                      {proj.name || "Project"}
                      {proj.type ? (
                        <span className="font-normal text-neutral-600">
                          {" "}
                          — {proj.type}
                        </span>
                      ) : null}
                    </h3>
                    {proj.date ? (
                      <span className="shrink-0 text-xs text-neutral-500">
                        {proj.date}
                      </span>
                    ) : null}
                  </div>
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

        {cv.skills.length > 0 ? (
          <Section title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {cv.skills
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <span
                    key={i}
                    className="rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-800 print:[print-color-adjust:exact]"
                  >
                    {s.name}
                  </span>
                ))}
            </div>
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

        {cv.certifications.length > 0 ? (
          <Section title="Certifications">
            <div className="space-y-1">
              {cv.certifications.map((c, i) => (
                <p key={i}>
                  <span className="font-semibold text-neutral-900">
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
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-neutral-900">
                      {org.role || "Role"}
                      {org.name ? (
                        <span className="font-normal text-neutral-600">
                          {" "}
                          — {org.name}
                        </span>
                      ) : null}
                    </h3>
                    {org.date ? (
                      <span className="shrink-0 text-xs text-neutral-500">
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
      </div>
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
    <section className="mt-5 first:mt-0">
      <h2 className="mb-2 inline-block border-b-2 border-sky-800 pb-0.5 text-xs font-bold uppercase tracking-widest text-sky-800">
        {title}
      </h2>
      {children}
    </section>
  );
}
