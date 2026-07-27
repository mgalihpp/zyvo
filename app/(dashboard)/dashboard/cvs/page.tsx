import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { CvList } from "@/features/cv/components/dashboard/cv-list";
import { getServerTrpc } from "@/server/trpc/server";

/** Kelola CV — full list of the user's CVs with quick actions. */
export default async function CvsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const trpc = await getServerTrpc();
  const initialCvs = await trpc.cv.list();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kelola CV</h1>
          <p className="text-sm text-muted-foreground">
            Buat, edit, dan kelola semua CV Anda.
          </p>
        </div>
      </div>

      <CvList initialCvs={initialCvs} />
    </div>
  );
}
