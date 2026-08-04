import { HtmlContent } from "@/features/cv/components/html-content";
import { CREATIVE_PAGE_BACKGROUND } from "./page-backgrounds";
import {
  CvPage,
  formatDateRange,
  join,
  orderedMainSections,
  type TemplateProps,
} from "./shared";

/**
 * Creative two-column template. A wide accent sidebar (40%) holds the photo,
 * contact details, skills and languages; the right column holds the narrative
 * sections. Bold accent color — aimed at designers and creative roles.
 */
export function CreativeTemplate({ cv }: TemplateProps) {
  const p = cv.personal;

  return (
    <CvPage
      className="grid grid-cols-1 sm:grid-cols-[40%_1fr] sm:grid-rows-[1fr] print:grid-cols-[40%_1fr] print:grid-rows-[1fr]"
      style={{ background: CREATIVE_PAGE_BACKGROUND }}
    >
      <aside className="p-7 text-[var(--cv-color-on-accent)]">
        {p.photo ? (
          // biome-ignore lint/performance/noImgElement: Puppeteer PDF export needs a plain img
          <img
            src={p.photo}
            alt={p.fullName || "Foto profile"}
            className="mb-5 size-28 rounded-lg object-cover ring-4 ring-[var(--cv-color-on-accent)]/20"
          />
        ) : null}

        <h1 className="text-[1.25em] font-bold leading-tight font-[family-name:var(--cv-font-heading)]">
          {p.fullName || "Nama Anda"}
        </h1>
        {p.headline ? (
          <p className="mt-1 text-[0.88em] opacity-75">{p.headline}</p>
        ) : null}

        <SideSection title="Kontak">
          <ul className="space-y-1.5 break-words text-[0.83em] opacity-85">
            {p.email ? <li>{p.email}</li> : null}
            {p.phone ? <li>{p.phone}</li> : null}
            {p.location ? <li>{p.location}</li> : null}
            {p.website ? <li>{p.website}</li> : null}
            {p.linkedin ? <li>{p.linkedin}</li> : null}
            {p.github ? <li>{p.github}</li> : null}
          </ul>
        </SideSection>

        {cv.skills.length > 0 ? (
          <SideSection title="Keahlian">
            <ul className="space-y-2">
              {cv.skills
                .filter((s) => s.name.trim())
                .map((s, i) => (
                  <li key={i}>
                    <span className="text-[0.83em]">{s.name}</span>
                    {cv.showSkillLevels ? (
                      <span
                        className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[var(--cv-color-on-accent)]/20"
                        aria-hidden
                      >
                        <span
                          className="h-full rounded-full bg-[var(--cv-color-on-accent)]/80"
                          // level 5 (expert) = 100%, 1 (beginner) = 20%
                          style={{ width: `${(s.level / 5) * 100}%` }}
                        />
                      </span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </SideSection>
        ) : null}

        {cv.interpersonal.length > 0 ? (
          <SideSection title="Interpersonal">
            <p className="text-[0.83em] opacity-85">
              {join(
                cv.interpersonal.map((s) => s.name),
                ", ",
              )}
            </p>
          </SideSection>
        ) : null}

        {cv.languages.length > 0 ? (
          <SideSection title="Bahasa">
            <ul className="space-y-1 text-[0.83em] opacity-85">
              {cv.languages
                .filter((l) => l.name.trim())
                .map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{l.name}</span>
                    {cv.showLanguageLevels && l.level ? (
                      <span className="opacity-70">{l.level}</span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </SideSection>
        ) : null}

        {cv.certifications.length > 0 ? (
          <SideSection title="Sertifikasi">
            <ul className="space-y-2 text-[0.83em] opacity-85">
              {cv.certifications.map((c, i) => (
                <li key={i}>
                  <p className="font-medium opacity-100">{c.name}</p>
                  {join([c.issuer, c.date]) ? (
                    <p className="opacity-70">{join([c.issuer, c.date])}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SideSection>
        ) : null}
      </aside>

      <div className="p-8">
        {orderedMainSections(cv).map((id) => {
          switch (id) {
            case "summary":
              return cv.summary?.trim() ? (
                <MainSection key="summary" title="Profil">
                  <p className="whitespace-pre-line">{cv.summary}</p>
                </MainSection>
              ) : null;
            case "experience":
              return cv.experience.length > 0 ? (
                <MainSection key="experience" title="Pengalaman">
                  <div className="space-y-4">
                    {cv.experience.map((exp, i) => (
                      <div key={i} data-entry>
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-semibold text-[var(--cv-color-heading)]">
                            {exp.role || "Posisi"}
                          </h3>
                          <span className="shrink-0 text-[0.82em] opacity-60">
                            {exp.location}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[0.85em] font-medium opacity-75">
                            {exp.company}
                          </p>
                          <span className="shrink-0 text-[0.82em] opacity-60">
                            {formatDateRange(
                              exp.startDate,
                              exp.endDate,
                              exp.current,
                            )}
                          </span>
                        </div>
                        {exp.description ? (
                          <HtmlContent
                            className="mt-1 text-[var(--cv-color-text)]"
                            html={exp.description}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </MainSection>
              ) : null;
            case "projects":
              return cv.projects.length > 0 ? (
                <MainSection key="projects" title="Proyek">
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
                            <span className="shrink-0 text-[0.82em] opacity-60">
                              {proj.date}
                            </span>
                          ) : null}
                        </div>
                        {proj.description ? (
                          <HtmlContent
                            className="mt-1 text-[var(--cv-color-text)]"
                            html={proj.description}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </MainSection>
              ) : null;
            case "education":
              return cv.education.length > 0 ? (
                <MainSection key="education" title="Pendidikan">
                  <div className="space-y-3">
                    {cv.education.map((edu, i) => (
                      <div key={i} data-entry>
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-semibold text-[var(--cv-color-heading)]">
                            {edu.school || "Institusi"}
                          </h3>
                          <span className="shrink-0 text-[0.82em] opacity-60">
                            {edu.location}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[0.88em]">
                            {join([edu.degree, edu.field], ", ")}
                          </p>
                          <span className="shrink-0 text-[0.82em] opacity-60">
                            {formatDateRange(edu.startDate, edu.endDate)}
                          </span>
                        </div>
                        {edu.gpa ? (
                          <p className="text-[0.82em] opacity-60">
                            • IPK: {edu.gpa}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </MainSection>
              ) : null;
            case "organizations":
              return cv.organizations.length > 0 ? (
                <MainSection key="organizations" title="Organisasi">
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
                            <span className="shrink-0 text-[0.82em] opacity-60">
                              {org.date}
                            </span>
                          ) : null}
                        </div>
                        {org.description ? (
                          <HtmlContent
                            className="mt-1 text-[var(--cv-color-text)]"
                            html={org.description}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </MainSection>
              ) : null;
            case "custom":
              return cv.custom.map((item, i) => (
                <MainSection
                  key={`custom-${i}`}
                  title={item.title || "Tambahan"}
                >
                  {item.description ? (
                    <HtmlContent
                      className="mt-1 text-[var(--cv-color-text)]"
                      html={item.description}
                    />
                  ) : null}
                </MainSection>
              ));
            default:
              return null;
          }
        })}
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
    <section className="mt-5">
      <h2 className="mb-2 text-[0.62em] font-bold uppercase tracking-widest opacity-55 font-[family-name:var(--cv-font-heading)]">
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
      <h2 className="mb-2 border-b-2 border-[var(--cv-color-accent)] pb-1 text-[0.82em] font-bold uppercase tracking-widest text-[var(--cv-color-accent)] font-[family-name:var(--cv-font-heading)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
