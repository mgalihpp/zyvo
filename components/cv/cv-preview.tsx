"use client";

import type { CvContent } from "@/lib/schemas/cv";
import { useCvStore } from "@/lib/stores/cv-store";
import { ClassicTemplate } from "./templates/classic";

/** Renders the currently edited CV using the selected template. */
export function CvPreview() {
  // Select each field individually so the store returns stable references and
  // avoids the "getServerSnapshot should be cached" infinite loop.
  const title = useCvStore((s) => s.title);
  const templateId = useCvStore((s) => s.templateId);
  const personal = useCvStore((s) => s.personal);
  const summary = useCvStore((s) => s.summary);
  const experience = useCvStore((s) => s.experience);
  const education = useCvStore((s) => s.education);
  const skills = useCvStore((s) => s.skills);
  const interpersonal = useCvStore((s) => s.interpersonal);
  const languages = useCvStore((s) => s.languages);
  const certifications = useCvStore((s) => s.certifications);
  const organizations = useCvStore((s) => s.organizations);
  const projects = useCvStore((s) => s.projects);
  const custom = useCvStore((s) => s.custom);

  const content: CvContent = {
    title,
    templateId,
    personal,
    summary,
    experience,
    education,
    skills,
    interpersonal,
    languages,
    certifications,
    organizations,
    projects,
    custom,
  };

  return (
    <div className="h-full overflow-auto bg-neutral-100 p-6 dark:bg-neutral-900">
      <ClassicTemplate cv={content} />
    </div>
  );
}
