import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Modern two-column template. A tinted left sidebar holds contact details,
 * skills, languages and certifications; the wider right column holds the
 * narrative sections (summary, experience, education, projects).
 *
 * The two columns collapse to a single column on narrow viewports so the
 * preview stays readable on phones; print/PDF keeps the two-column layout.
 */
export function ModernTemplate({ cv }: TemplateProps) {
  const p = cv.personal;

  return (
    <article className="mx-auto grid w-full max-w-[794px] grid-cols-1 bg-white text-neutral-800 shadow-sm sm:grid-cols-[34%_1fr] print:grid-cols-[34%_1fr]">
      <aside className="bg-neutral-900 p-6 text-neutral-200 print:bg-neutral-900 print:[print-color-adjust:exact]">
        <h1 className="text-[1.35em] font-bold leading-tight text-white font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Your Name"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-[0.92em] text-neutral-400">{p.headline}</p>
        ) : null}

        <SideSection title="Contact">
          <ul className="space-y-1 break-words text-[0.85em] text-neutral-300">
            {p.email ? <li>{p.email}</li> : null}
            {p.phone ? <li>{p.phone}</li> : null}
            {p.location ? <li>{p.location}</li> : null}
            {p.website ? <li>{p.website}</li> : null}
            {p.linkedin ? <li>{p.linkedin}</li> : null}
            {p.github ? <li>{p.github}</li> : null}
          </ul>
        </SideSection>

        {cv.skills.length > 0 ? (
          <SideSection title="Skills">
            <ul className="space-y-1.5">
              {cv.skills
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <li key={i}>
                    <span className="text-[0.85em] text-neutral-200">
                      {s.name}
                    </span>
                    <span
                      className="mt-1 flex h-1 overflow-hidden rounded-full bg-neutral-700"
                      aria-hidden
                    >
                      <span
                        className="h-full rounded-full bg-neutral-300"
                        // level 1 (expert) = 100%, 5 (beginner) = 20%
                        style={{ width: `${((6 - s.level) / 5) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
            </ul>
          </SideSection>
        ) : null}

        {cv.interpersonal.length > 0 ? (
          <SideSection title="Interpersonal">
            <p className="text-[0.85em] text-neutral-300">
              {join(
                cv.interpersonal.map((s) => s.name),
                ", ",
              )}
            </p>
          </SideSection>
        ) : null}

        {cv.languages.length > 0 ? (
          <SideSection title="Languages">
            <ul className="space-y-1 text-[0.85em] text-neutral-300">
              {cv.languages
                .filter((l) => l.name.trim())
                .map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{l.name}</span>
                    {l.level ? (
                      <span className="text-neutral-500">{l.level}</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </SideSection>
        ) : null}

        {cv.certifications.length > 0 ? (
          <SideSection title="Certifications">
            <ul className="space-y-2 text-[0.85em] text-neutral-300">
              {cv.certifications.map((c, i) => (
                <li key={i}>
                  <p className="font-medium text-neutral-200">{c.name}</p>
                  {join([c.issuer, c.date]) ? (
                    <p className="text-neutral-500">
                      {join([c.issuer, c.date])}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SideSection>
        ) : null}
      </aside>

      <div className="p-8">
        {cv.summary?.trim() ? (
          <MainSection title="Profile">
            <p className="whitespace-pre-line text-neutral-700">{cv.summary}</p>
          </MainSection>
        ) : null}

        {cv.experience.length > 0 ? (
          <MainSection title="Experience">
            <div className="space-y-3">
              {cv.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-neutral-900">
                      {exp.role || "Role"}
                    </h3>
                    <span className="shrink-0 text-[0.85em] text-neutral-500">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  </div>
                  <p className="text-[0.85em] font-medium text-neutral-600">
                    {join([exp.company, exp.location])}
                  </p>
                  {exp.description ? (
                    <p className="mt-1 whitespace-pre-line text-neutral-700">
                      {exp.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </MainSection>
        ) : null}

        {cv.projects.length > 0 ? (
          <MainSection title="Projects">
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
                      <span className="shrink-0 text-[0.85em] text-neutral-500">
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
          </MainSection>
        ) : null}

        {cv.education.length > 0 ? (
          <MainSection title="Education">
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
          </MainSection>
        ) : null}

        {cv.organizations.length > 0 ? (
          <MainSection title="Organizations">
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
          </MainSection>
        ) : null}

        {cv.custom.length > 0 ? (
          <MainSection title="Additional">
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
          </MainSection>
        ) : null}
      </div>
    </article>
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
      <h2 className="mb-2 text-[0.65em] font-bold uppercase tracking-widest text-neutral-500 font-[family-name:var(--cv-font-heading)]">
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
      <h2 className="mb-2 border-b border-neutral-200 pb-1 text-[0.85em] font-bold uppercase tracking-widest text-neutral-700 font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
