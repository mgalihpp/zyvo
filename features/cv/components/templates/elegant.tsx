import { HtmlContent } from "@/features/cv/components/html-content";
import { CvPage, formatDateRange, join, type TemplateProps } from "./shared";

/**
 * Elegant single-column template. Centered header with a large circular photo,
 * serif typography, warm palette and generous whitespace — aimed at
 * consultants, educators, and anyone wanting a refined look.
 */
export function ElegantTemplate({ cv }: TemplateProps) {
  const p = cv.personal;

  return (
    <CvPage>
      <header className="px-12 pt-10 pb-6 text-center">
        {p.photo ? (
          <div className="mb-4 flex justify-center">
            {/* biome-ignore lint/performance/noImgElement: Puppeteer PDF export needs a plain img */}
            <img
              src={p.photo}
              alt={p.fullName || "Foto profile"}
              className="size-24 rounded-full object-cover ring-2 ring-[var(--cv-color-accent)]/40"
            />
          </div>
        ) : null}
        <h1 className="text-[1.7em] font-bold tracking-wide text-[var(--cv-color-heading)] font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Nama Anda"}
        </h1>
        {p.headline ? (
          <p className="mt-1.5 text-[0.95em] italic text-[var(--cv-color-accent)]">
            {p.headline}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[0.8em] opacity-70">
          {p.email ? <span>{p.email}</span> : null}
          {p.phone ? <span>{p.phone}</span> : null}
          {p.location ? <span>{p.location}</span> : null}
          {p.website ? <span>{p.website}</span> : null}
          {p.linkedin ? <span>{p.linkedin}</span> : null}
          {p.github ? <span>{p.github}</span> : null}
        </div>
        <div className="mx-auto mt-5 h-px w-24 bg-[var(--cv-color-accent)]/50" />
      </header>

      <div className="px-12 pb-10">
        {cv.summary?.trim() ? (
          <Section title="Tentang Saya">
            <p className="whitespace-pre-line text-center italic opacity-80">
              {cv.summary}
            </p>
          </Section>
        ) : null}

        {cv.experience.length > 0 ? (
          <Section title="Pengalaman">
            <div className="space-y-5">
              {cv.experience.map((exp, i) => (
                <div key={i} data-entry>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {exp.role || "Posisi"}
                    </h3>
                    <span className="shrink-0 text-[0.82em] italic opacity-55">
                      {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                    </span>
                  </div>
                  <p className="text-[0.88em] text-[var(--cv-color-accent)]">
                    {join([exp.company, exp.location])}
                  </p>
                  {exp.description ? (
                    <HtmlContent
                      className="mt-1.5 text-[0.92em] text-[var(--cv-color-text)]"
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
            <div className="space-y-4">
              {cv.education.map((edu, i) => (
                <div key={i} data-entry>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold text-[var(--cv-color-heading)]">
                      {edu.school || "Institusi"}
                    </h3>
                    <span className="shrink-0 text-[0.82em] italic opacity-55">
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
          <div className="mt-7 grid grid-cols-2 gap-10 [&>section]:mt-0">
            <Section title="Keahlian">
              <ul className="space-y-1 text-[0.88em]">
                {cv.skills
                  .filter((s) => s.name.trim())
                  .map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[var(--cv-color-accent)]">✦</span>
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
                        <span className="italic opacity-60">{l.level}</span>
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
                    <span className="text-[var(--cv-color-accent)]">✦</span>
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
                      <span className="italic opacity-60">{l.level}</span>
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
                <div key={i} data-entry>
                  <p className="text-[0.9em] font-medium text-[var(--cv-color-heading)]">
                    {c.name}
                  </p>
                  {join([c.issuer, c.date]) ? (
                    <p className="text-[0.82em] italic opacity-60">
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
                <div key={i} data-entry>
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
                      <span className="shrink-0 text-[0.82em] italic opacity-55">
                        {proj.date}
                      </span>
                    ) : null}
                  </div>
                  {proj.description ? (
                    <HtmlContent
                      className="mt-0.5 text-[0.88em] text-[var(--cv-color-text)]"
                      html={proj.description}
                    />
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
                <div key={i} data-entry>
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
                      <span className="shrink-0 text-[0.82em] italic opacity-55">
                        {org.date}
                      </span>
                    ) : null}
                  </div>
                  {org.description ? (
                    <HtmlContent
                      className="mt-0.5 text-[0.88em] text-[var(--cv-color-text)]"
                      html={org.description}
                    />
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
                "  ·  ",
              )}
            </p>
          </Section>
        ) : null}

        {cv.custom.length > 0 ? (
          <Section title="Tambahan">
            <div className="space-y-2">
              {cv.custom.map((item, i) => (
                <div key={i} data-entry>
                  <h3 className="text-[0.9em] font-semibold text-[var(--cv-color-heading)]">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <HtmlContent
                      className="mt-0.5 text-[0.88em] text-[var(--cv-color-text)]"
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
    <section className="mt-7 first:mt-0">
      <h2 className="mb-3 text-center text-[0.72em] font-bold uppercase tracking-[0.18em] text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      <div className="mx-auto mb-3 h-px w-full bg-[var(--cv-color-accent)]/20" />
      {children}
    </section>
  );
}
