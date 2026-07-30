import { formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Executive template. Single column with a full-width accent header band; the
 * profile photo (when set) sits as a circle on the right of that band.
 * Formal serif typography — aimed at senior professionals.
 */
export function ExecutiveTemplate({ cv }: TemplateProps) {
  const p = cv.personal;

  return (
    <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-[var(--cv-color-bg)] text-[var(--cv-color-text)] shadow-sm print:min-h-[297mm] print:[print-color-adjust:exact]">
      <header className="bg-[var(--cv-color-accent)] px-10 py-8 print:[print-color-adjust:exact]">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-[1.6em] font-bold leading-tight text-[var(--cv-color-on-accent)] font-[family-name:var(--cv-font-heading)]">
              {p.fullName || "Nama Anda"}
            </h1>
            {p.headline ? (
              <p className="mt-1 text-[0.95em] text-[var(--cv-color-on-accent)] opacity-75">
                {p.headline}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.78em] text-[var(--cv-color-on-accent)] opacity-70">
              {p.email ? <span>{p.email}</span> : null}
              {p.phone ? <span>{p.phone}</span> : null}
              {p.location ? <span>{p.location}</span> : null}
              {p.website ? <span>{p.website}</span> : null}
              {p.linkedin ? <span>{p.linkedin}</span> : null}
              {p.github ? <span>{p.github}</span> : null}
            </div>
          </div>
          {p.photo ? (
            // biome-ignore lint/performance/noImgElement: Puppeteer PDF export needs a plain img
            <img
              src={p.photo}
              alt={p.fullName || "Foto profile"}
              className="size-20 shrink-0 rounded-full object-cover ring-2 ring-[var(--cv-color-on-accent)]/30"
            />
          ) : null}
        </div>
      </header>

      <div className="px-10 py-7">
        {cv.summary?.trim() ? (
          <Section title="Ringkasan Profil">
            <p className="whitespace-pre-line">{cv.summary}</p>
          </Section>
        ) : null}

        {cv.experience.length > 0 ? (
          <Section title="Pengalaman Kerja">
            <div className="space-y-4">
              {cv.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {exp.role || "Posisi"}
                    </h3>
                    <span className="shrink-0 text-[0.82em] opacity-60">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  </div>
                  <p className="text-[0.88em] font-medium opacity-75">
                    {join([exp.company, exp.location])}
                  </p>
                  {exp.description ? (
                    <p className="mt-1 whitespace-pre-line text-[0.93em]">
                      {exp.description}
                    </p>
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
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {edu.school || "Institusi"}
                    </h3>
                    <span className="shrink-0 text-[0.82em] opacity-60">
                      {formatDateRange(edu.startDate, edu.endDate)}
                    </span>
                  </div>
                  <p className="text-[0.88em]">
                    {join([edu.degree, edu.field], ", ")}
                    {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {cv.skills.length > 0 && cv.languages.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-8 [&>section]:mt-0">
            <Section title="Keahlian">
              <ul className="space-y-1 text-[0.88em]">
                {cv.skills
                  .filter((s) => s.name.trim())
                  .map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[var(--cv-color-accent)]" />
                      {s.name}
                    </li>
                  ))}
              </ul>
            </Section>
            <Section title="Bahasa">
              <ul className="space-y-1 text-[0.88em]">
                {cv.languages
                  .filter((l) => l.name.trim())
                  .map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{l.name}</span>
                      {l.level ? (
                        <span className="opacity-60">{l.level}</span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </Section>
          </div>
        ) : cv.skills.length > 0 ? (
          <Section title="Keahlian">
            <ul className="space-y-1 text-[0.88em]">
              {cv.skills
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[var(--cv-color-accent)]" />
                    {s.name}
                  </li>
                ))}
            </ul>
          </Section>
        ) : cv.languages.length > 0 ? (
          <Section title="Bahasa">
            <ul className="space-y-1 text-[0.88em]">
              {cv.languages
                .filter((l) => l.name.trim())
                .map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{l.name}</span>
                    {l.level ? (
                      <span className="opacity-60">{l.level}</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </Section>
        ) : null}

        {cv.certifications.length > 0 ? (
          <Section title="Sertifikasi">
            <div className="space-y-2">
              {cv.certifications.map((c, i) => (
                <div key={i}>
                  <p className="text-[0.9em] font-medium text-[var(--cv-color-heading)]">
                    {c.name}
                  </p>
                  {join([c.issuer, c.date]) ? (
                    <p className="text-[0.82em] opacity-65">
                      {join([c.issuer, c.date])}
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
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                      {proj.name}
                      {proj.type ? (
                        <span className="font-normal opacity-70">
                          {" "}
                          — {proj.type}
                        </span>
                      ) : null}
                    </h3>
                    {proj.date ? (
                      <span className="shrink-0 text-[0.82em] opacity-60">
                        {proj.date}
                      </span>
                    ) : null}
                  </div>
                  {proj.description ? (
                    <p className="mt-0.5 whitespace-pre-line text-[0.88em]">
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
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                      {org.role || "Posisi"}
                      {org.name ? (
                        <span className="font-normal opacity-70">
                          {" "}
                          — {org.name}
                        </span>
                      ) : null}
                    </h3>
                    {org.date ? (
                      <span className="shrink-0 text-[0.82em] opacity-60">
                        {org.date}
                      </span>
                    ) : null}
                  </div>
                  {org.description ? (
                    <p className="mt-0.5 whitespace-pre-line text-[0.88em]">
                      {org.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {cv.interpersonal.length > 0 ? (
          <Section title="Keahlian Interpersonal">
            <p className="text-[0.88em]">
              {join(
                cv.interpersonal.map((s) => s.name),
                ", ",
              )}
            </p>
          </Section>
        ) : null}

        {cv.custom.length > 0 ? (
          <Section title="Tambahan">
            <div className="space-y-2">
              {cv.custom.map((item, i) => (
                <div key={i}>
                  <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-0.5 whitespace-pre-line text-[0.88em]">
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
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2.5 border-b-2 border-[var(--cv-color-accent)] pb-1 text-[0.75em] font-bold uppercase tracking-[0.12em] text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
