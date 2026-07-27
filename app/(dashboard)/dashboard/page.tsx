import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { CvList } from "@/features/cv/components/dashboard/cv-list";
import { Greeting } from "@/features/cv/components/dashboard/greeting";
import { TemplateGallery } from "@/features/cv/components/dashboard/template-gallery";
import { getServerTrpc } from "@/server/trpc/server";

/** Beranda — the dashboard home. */
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  // Server-fetch the list so it's in the initial HTML (no loading flash).
  const trpc = await getServerTrpc();
  const initialCvs = await trpc.cv.list();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <Greeting name={session.user.name ?? ""} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kelola CV Anda</h2>
          <Link
            href="/dashboard/cvs"
            className="text-sm font-medium text-primary hover:underline"
          >
            Lihat semua →
          </Link>
        </div>
        <CvList initialCvs={initialCvs} limit={4} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Template Pilihan</h2>
          <Link
            href="/dashboard/templates"
            className="text-sm font-medium text-primary hover:underline"
          >
            Lihat semua →
          </Link>
        </div>
        <TemplateGallery showFilters={false} limit={3} />
      </section>
    </div>
  );
}
