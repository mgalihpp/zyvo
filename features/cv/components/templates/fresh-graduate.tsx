import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Fresh-graduate template. Leads with education and skills (what a new grad has
 * most of) before experience. Two-column body on wide screens; collapses to one
 * column on narrow viewports. Warm accent for a friendly, entry-level tone.
 */
export function FreshGraduateTemplate({ cv }: TemplateProps) {
  const p = cv.personal;
  const contactLine = join([p.email, p.phone, p.location]);
  const linkLine = join([p.website, p.linkedin, p.github]);

  return (
    <article className="mx-auto w-full max-w-[794px] bg-white p-10 text-[13px] leading-relaxed text-neutral-800 shadow-sm">
      <header className="border-b-2 border-emerald-600 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-0.5 text-sm font-medium text-emerald-700">
            {p.headline}
          </p>
        ) : null}
        {contactLine ? (
          <p className="mt-2 text-xs text-neutral-600">{contactLine}</p>
        ) : null}
        {linkLine ? (
          <p className="mt-1 text-xs text-neutral-600">{linkLine}</p>
        ) : null}
      </header>

      {cv.summary?.trim() ? (
        <Section title="About Me">
          <p className="whitespace-pre-line text-neutral-700">{cv.summary}</p>
        </Section>
      ) : null}

      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 print:grid-cols-2">
        <div>
          {cv.education.length > 0 ? (
            <Section title="Education">
              <div className="space-y-3">
                {cv.education.map((edu, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-neutral-900">
                      {edu.school || "School"}
                    </h3>
                    <p className="text-neutral-700">
                      {join([edu.degree, edu.field], ", ")}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDateRange(edu.startDate, edu.endDate)}
                      {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                    </p>
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
                      className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800 print:[print-color-adjust:exact]"
                    >
                      {s.name}
                    </span>
                  ))}
              </div>
            </Section>
          ) : null}

          {cv.interpersonal.length > 0 ? (
            <Section title="Interpersonal">
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
              <ul className="space-y-0.5 text-neutral-700">
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
        </div>

        <div>
          {cv.experience.length > 0 ? (
            <Section title="Experience">
              <div className="space-y-3">
                {cv.experience.map((exp, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-neutral-900">
                      {exp.role || "Role"}
                    </h3>
                    <p className="text-xs font-medium text-neutral-600">
                      {join([exp.company, exp.location])}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </p>
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

          {cv.projects.length > 0 ? (
            <Section title="Projects">
              <div className="space-y-3">
                {cv.projects.map((proj, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-neutral-900">
                      {proj.name || "Project"}
                    </h3>
                    {proj.date ? (
                      <p className="text-xs text-neutral-500">{proj.date}</p>
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

          {cv.organizations.length > 0 ? (
            <Section title="Organizations">
              <div className="space-y-3">
                {cv.organizations.map((org, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-neutral-900">
                      {join([org.role, org.name], " — ") || "Organization"}
                    </h3>
                    {org.date ? (
                      <p className="text-xs text-neutral-500">{org.date}</p>
                    ) : null}
                    {org.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-neutral-700">
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
    <section className="mt-5">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
        {title}
      </h2>
      {children}
    </section>
  );
}
