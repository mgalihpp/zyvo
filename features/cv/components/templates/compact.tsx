import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Compact two-column template. Dense layout maximizing content per page, with
 * a small square photo in the header. Left column (35%) holds skills,
 * languages and certifications; the right column holds the main sections.
 * Aimed at experienced professionals with long histories.
 */
export function CompactTemplate({ cv }: TemplateProps) {
  const p = cv.personal;

  return (
    <CvPage>
      <header className="border-b-4 border-[var(--cv-color-accent)] px-8 py-5 print:[print-color-adjust:exact]">
        <div className="flex items-start gap-4">
          {p.photo ? (
            // biome-ignore lint/performance/noImgElement: Puppeteer PDF export needs a plain img
            <img
              src={p.photo}
              alt={p.fullName || "Foto profile"}
              className="size-16 shrink-0 rounded-md object-cover"
            />
          ) : null}
          <div className="flex-1">
            <h1 className="text-[1.4em] font-bold leading-tight text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
              {p.fullName || "Nama Anda"}
            </h1>
            {p.headline ? (
              <p className="mt-0.5 text-[0.9em] font-medium text-[var(--cv-color-accent)]">
                {p.headline}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.75em] opacity-65">
              {p.email ? <span>{p.email}</span> : null}
              {p.phone ? <span>{p.phone}</span> : null}
              {p.location ? <span>{p.location}</span> : null}
              {p.website ? <span>{p.website}</span> : null}
              {p.linkedin ? <span>{p.linkedin}</span> : null}
              {p.github ? <span>{p.github}</span> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-[35%_1fr] print:grid-cols-[35%_1fr]">
        <aside className="border-r border-[var(--cv-color-accent)]/15 px-6 py-5">
          {cv.skills.length > 0 ? (
            <SideSection title="Keahlian">
              <ul className="space-y-1 text-[0.82em]">
                {cv.skills
                  .filter((s) => s.name.trim())
                  .map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="size-1 shrink-0 rounded-full bg-[var(--cv-color-accent)]" />
                      {s.name}
                    </li>
                  ))}
              </ul>
            </SideSection>
          ) : null}

          {cv.interpersonal.length > 0 ? (
            <SideSection title="Interpersonal">
              <ul className="space-y-1 text-[0.82em]">
                {cv.interpersonal
                  .filter((s) => s.name.trim())
                  .map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="size-1 shrink-0 rounded-full bg-[var(--cv-color-accent)]" />
                      {s.name}
                    </li>
                  ))}
              </ul>
            </SideSection>
          ) : null}

          {cv.languages.length > 0 ? (
            <SideSection title="Bahasa">
              <ul className="space-y-1 text-[0.82em]">
                {cv.languages
                  .filter((l) => l.name.trim())
                  .map((l, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{l.name}</span>
                      {l.level ? (
                        <span className="opacity-60">{l.level}</span>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </SideSection>
          ) : null}

          {cv.certifications.length > 0 ? (
            <SideSection title="Sertifikasi">
              <ul className="space-y-2 text-[0.82em]">
                {cv.certifications.map((c, i) => (
                  <li key={i}>
                    <p className="font-medium text-[var(--cv-color-heading)]">
                      {c.name}
                    </p>
                    {join([c.issuer, c.date]) ? (
                      <p className="opacity-60">{join([c.issuer, c.date])}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}

          {cv.organizations.length > 0 ? (
            <SideSection title="Organisasi">
              <div className="space-y-2 text-[0.82em]">
                {cv.organizations.map((org, i) => (
                  <div key={i}>
                    <p className="font-medium text-[var(--cv-color-heading)]">
                      {org.role || "Posisi"}
                    </p>
                    {org.name ? <p className="opacity-70">{org.name}</p> : null}
                    {org.date ? (
                      <p className="text-[0.9em] opacity-50">{org.date}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </SideSection>
          ) : null}
        </aside>

        <div className="px-6 py-5">
          {cv.summary?.trim() ? (
            <MainSection title="Profil">
              <p className="whitespace-pre-line text-[0.9em]">{cv.summary}</p>
            </MainSection>
          ) : null}

          {cv.experience.length > 0 ? (
            <MainSection title="Pengalaman">
              <div className="space-y-3">
                {cv.experience.map((exp, i) => (
                  <div key={i} data-entry>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                        {exp.role || "Posisi"}
                      </h3>
                      <span className="shrink-0 text-[0.78em] opacity-55">
                        {formatDateRange(
                          exp.startDate,
                          exp.endDate,
                          exp.current,
                        )}
                      </span>
                    </div>
                    <p className="text-[0.82em] font-medium opacity-70">
                      {join([exp.company, exp.location])}
                    </p>
                    {exp.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.85em]">
                        {exp.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.education.length > 0 ? (
            <MainSection title="Pendidikan">
              <div className="space-y-2">
                {cv.education.map((edu, i) => (
                  <div key={i} data-entry>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                        {edu.school || "Institusi"}
                      </h3>
                      <span className="shrink-0 text-[0.78em] opacity-55">
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>
                    <p className="text-[0.82em]">
                      {join([edu.degree, edu.field], ", ")}
                      {edu.gpa ? `  •  GPA ${edu.gpa}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.projects.length > 0 ? (
            <MainSection title="Proyek">
              <div className="space-y-2">
                {cv.projects.map((proj, i) => (
                  <div key={i} data-entry>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                        {proj.name}
                        {proj.type ? (
                          <span className="font-normal opacity-65">
                            {" "}
                            — {proj.type}
                          </span>
                        ) : null}
                      </h3>
                      {proj.date ? (
                        <span className="shrink-0 text-[0.78em] opacity-55">
                          {proj.date}
                        </span>
                      ) : null}
                    </div>
                    {proj.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.85em]">
                        {proj.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}

          {cv.custom.length > 0 ? (
            <MainSection title="Tambahan">
              <div className="space-y-2">
                {cv.custom.map((item, i) => (
                  <div key={i} data-entry>
                    <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-0.5 whitespace-pre-line text-[0.85em]">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MainSection>
          ) : null}
        </div>
      </div>
    </CvPage>
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
    <section className="mb-4">
      <h2 className="mb-1.5 text-[0.62em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
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
    <section className="mb-4">
      <h2 className="mb-1.5 border-b border-[var(--cv-color-accent)]/25 pb-0.5 text-[0.72em] font-bold uppercase tracking-widest text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
