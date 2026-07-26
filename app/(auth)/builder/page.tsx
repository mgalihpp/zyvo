import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { DashboardClient } from "@/features/cv/components/dashboard-client";
import { getServerTrpc } from "@/server/trpc/server";

export default async function BuilderPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  // Fetch the CV list on the server so the dashboard renders with data in the
  // initial HTML — no client-side loading flash for the common case.
  const trpc = await getServerTrpc();
  const initialCvs = await trpc.cv.list();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <BrandLogo />
        <SignOutButton />
      </header>

      <div className="flex-1 p-6">
        <DashboardClient initialCvs={initialCvs} />
      </div>
    </main>
  );
}
