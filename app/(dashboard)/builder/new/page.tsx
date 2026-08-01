import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({ title: "Buat CV" });

/** Full-page "buat CV baru" wizard — Manual / Import / AI. */
export default async function BuilderNewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  return <OnboardingWizard mode="create" />;
}
