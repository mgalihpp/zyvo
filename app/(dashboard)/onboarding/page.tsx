import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { constructMetadata } from "@/lib/seo";
import { getServerTrpc } from "@/server/trpc/server";

export const metadata: Metadata = constructMetadata({ title: "Mulai" });

/** Onboarding for users with zero CVs. Users with CVs are sent back. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const trpc = await getServerTrpc();
  const cvs = await trpc.cv.list();
  if (cvs.length > 0) redirect("/dashboard");

  return <OnboardingWizard />;
}
