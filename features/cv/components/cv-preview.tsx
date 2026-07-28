"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import type { CvContent } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { getTemplate } from "./templates";

function PreviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Skeleton className="aspect-[1/1.414] w-full" />
    </div>
  );
}

export function CvPreview() {
  // Select each field individually so the store returns stable references and
  // avoids the "getServerSnapshot should be cached" infinite loop.
  const title = useCvStore((s) => s.title);
  const templateId = useCvStore((s) => s.templateId);
  const typography = useCvStore((s) => s.typography);
  const colors = useCvStore((s) => s.colors);
  const draftColors = useCvStore((s) => s.draftColors);
  const activePanel = useCvStore((s) => s.activePanel);
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

  // Live-preview uncommitted color edits while the colors panel is open.
  const effectiveColors =
    activePanel === "colors" && draftColors ? draftColors : colors;

  const content: CvContent = {
    title,
    templateId,
    typography,
    colors: effectiveColors,
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

  const Template = getTemplate(templateId).lazyComponent;

  return (
    <div className="h-full overflow-auto bg-neutral-100 p-6 dark:bg-neutral-900">
      <Suspense fallback={<PreviewSkeleton />}>
        <div style={cvRootStyle({ typography, colors: effectiveColors })}>
          <Template cv={content} />
        </div>
      </Suspense>
    </div>
  );
}
