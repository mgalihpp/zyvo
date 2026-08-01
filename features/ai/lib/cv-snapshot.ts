import type { CvContent } from "@/features/cv/schemas/cv";

/** Serialize a CV to a compact string for use in AI prompts. */
export function buildSnapshot(cv: CvContent): string {
  const lines: string[] = [];

  lines.push(`# CV: ${cv.personal.fullName || "(tanpa nama)"}`);
  if (cv.personal.headline) lines.push(`Headline: ${cv.personal.headline}`);
  if (cv.personal.location) lines.push(`Lokasi: ${cv.personal.location}`);
  if (cv.summary) lines.push(`\n## Ringkasan\n${cv.summary}`);

  if (cv.experience.length > 0) {
    lines.push("\n## Pengalaman Kerja");
    for (const e of cv.experience) {
      const period = e.current
        ? `${e.startDate} – sekarang`
        : `${e.startDate} – ${e.endDate}`;
      lines.push(`- ${e.role} di ${e.company} (${period})`);
      if (e.description) lines.push(`  ${e.description.slice(0, 300)}`);
    }
  }

  if (cv.education.length > 0) {
    lines.push("\n## Pendidikan");
    for (const e of cv.education) {
      lines.push(
        `- ${e.degree} ${e.field} — ${e.school} (${e.startDate}–${e.endDate})`,
      );
    }
  }

  if (cv.skills.length > 0) {
    lines.push("\n## Keahlian");
    lines.push(cv.skills.map((s) => s.name).join(", "));
  }

  if (cv.projects.length > 0) {
    lines.push("\n## Proyek");
    for (const p of cv.projects) {
      lines.push(
        `- ${p.name}${p.type ? ` (${p.type})` : ""}: ${p.description?.slice(0, 200) ?? ""}`,
      );
    }
  }

  if (cv.certifications.length > 0) {
    lines.push("\n## Sertifikasi");
    for (const c of cv.certifications) {
      lines.push(`- ${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`);
    }
  }

  if (cv.languages.length > 0) {
    lines.push("\n## Bahasa");
    lines.push(cv.languages.map((l) => `${l.name} (${l.level})`).join(", "));
  }

  // Cap total length to ~4000 chars to stay within token budget
  return lines.join("\n").slice(0, 4000);
}
