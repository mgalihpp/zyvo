import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { TemplateGallery } from "@/features/cv/components/dashboard/template-gallery";

/** Template — browse available templates and start a CV from one. */
export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Template</h1>
        <p className="text-sm text-muted-foreground">
          Pilih template dan mulai buat CV Anda.
        </p>
      </div>

      <TemplateGallery />
    </div>
  );
}
