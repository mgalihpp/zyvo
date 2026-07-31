import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { TemplateGallery } from "@/features/cv/components/dashboard/template-gallery";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({ title: "Template" });

/** Template — browse available templates and start a CV from one. */
export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih template dan mulai buat CV Anda.
        </p>
      </div>

      <TemplateGallery />
    </div>
  );
}
