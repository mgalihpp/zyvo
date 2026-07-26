import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { prisma } from "@/lib/db";
import type { CvContent } from "@/lib/schemas/cv";
import { type BuilderPanel, isBuilderPanel } from "@/lib/stores/cv-store";
import { BuilderClient } from "./builder-client";

/** Coerce a possibly-legacy level value (old string / number / null) to 1–5. */
function toLevel(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return 3;
  return Math.round(n);
}

export default async function CvBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ cvId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const { cvId } = await params;
  const cv = await prisma.cV.findUnique({ where: { id: cvId } });

  if (!cv || cv.userId !== session.user.id) {
    notFound();
  }

  // Resolve the active panel from `?panel=` on the server so the correct panel
  // renders on the first paint (no client-side "personal -> URL panel" flicker).
  const panelParam = (await searchParams).panel;
  const initialPanel: BuilderPanel | undefined = isBuilderPanel(panelParam)
    ? panelParam
    : undefined;

  // Reuse the server-side session so the header renders the real user on the
  // first paint instead of flickering through the "Pengguna" fallback.
  const initialUser = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };

  const initialContent: CvContent = {
    title: cv.title,
    templateId: cv.templateId,
    personal: {
      fullName: cv.personal?.fullName ?? "",
      headline: cv.personal?.headline ?? "",
      email: cv.personal?.email ?? "",
      phone: cv.personal?.phone ?? "",
      location: cv.personal?.location ?? "",
      website: cv.personal?.website ?? "",
      linkedin: cv.personal?.linkedin ?? "",
      github: cv.personal?.github ?? "",
    },
    summary: cv.summary ?? "",
    experience: cv.experience.map((e) => ({
      company: e.company,
      role: e.role,
      location: e.location ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      current: e.current,
      description: e.description ?? "",
    })),
    education: cv.education.map((e) => ({
      school: e.school,
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      gpa: e.gpa ?? "",
    })),
    skills: cv.skills.map((s) => ({ name: s.name, level: toLevel(s.level) })),
    interpersonal: cv.interpersonal.map((i) => ({ name: i.name })),
    languages: cv.languages.map((l) => ({
      name: l.name,
      level: l.level ?? "",
    })),
    certifications: cv.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? "",
      date: c.date ?? "",
      url: c.url ?? "",
      description: c.description ?? "",
    })),
    organizations: cv.organizations.map((o) => ({
      name: o.name,
      role: o.role ?? "",
      date: o.date ?? "",
      description: o.description ?? "",
    })),
    projects: cv.projects.map((p) => ({
      name: p.name,
      type: p.type ?? "",
      date: p.date ?? "",
      skill: p.skill ?? "",
      description: p.description ?? "",
    })),
    custom: cv.custom.map((c) => ({
      title: c.title,
      description: c.description ?? "",
    })),
  };

  // Key by cvId so switching CVs fully remounts the builder: the store
  // re-hydrates from scratch and the autosave hook resets, avoiding any
  // cross-CV state bleed or a stale debounced save firing against the new id.
  return (
    <BuilderClient
      key={cvId}
      cvId={cvId}
      initialContent={initialContent}
      initialPanel={initialPanel}
      initialUser={initialUser}
    />
  );
}
