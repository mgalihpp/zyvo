import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Buat CV",
  robots: { index: false, follow: false },
});

import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { BuilderClient } from "@/features/cv/components/builder-client";
import { toCvContent } from "@/features/cv/lib/cv-content";
import {
  type BuilderPanel,
  isBuilderPanel,
} from "@/features/cv/stores/cv-store";
import { prisma } from "@/lib/db";

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

  const initialContent = toCvContent(cv);

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
