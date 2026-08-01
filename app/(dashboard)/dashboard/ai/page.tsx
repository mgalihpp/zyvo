import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AiGeneratorPage } from "@/features/ai/components/ai-generator-page";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Buat dengan AI",
});

/** Full-page AI CV generator — the dashboard "Atau buat dengan AI" link lands here. */
export default async function AiGeneratorRoute() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  return <AiGeneratorPage />;
}
