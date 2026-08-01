import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";
import { getPlan } from "@/features/billing/server/entitlements";
import { CvList } from "@/features/cv/components/dashboard/cv-list";
import { ONBOARDING_SKIP_COOKIE } from "@/features/onboarding/lib/constants";
import { prisma } from "@/lib/db";
import { constructMetadata } from "@/lib/seo";
import { getServerTrpc } from "@/server/trpc/server";

export const metadata: Metadata = constructMetadata({ title: "Dashboard" });

/** Resume — main dashboard page, FlowCV style. */
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const trpc = await getServerTrpc();
  const initialCvs = await trpc.cv.list();

  if (initialCvs.length === 0) {
    const cookieStore = await cookies();
    if (!cookieStore.get(ONBOARDING_SKIP_COOKIE)) {
      redirect("/onboarding");
    }
  }

  const plan = await getPlan(prisma, session.user.id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CV Saya</h1>
        {plan === "free" && (
          <p className="mt-1 text-sm text-muted-foreground">
            CV pertama Anda gratis selamanya. Butuh lebih dari satu CV?{" "}
            <Link
              href="/dashboard/billing"
              className="font-medium underline hover:text-foreground"
            >
              Tingkatkan paket
            </Link>
          </p>
        )}
      </div>

      <CvList initialCvs={initialCvs} />
    </div>
  );
}
