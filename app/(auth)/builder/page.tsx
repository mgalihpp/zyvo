import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { DashboardClient } from "./dashboard-client";
import { SignOutButton } from "./sign-out-button";

export default async function BuilderPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-lg font-semibold">CV Builder</h1>
        <SignOutButton />
      </header>

      <div className="flex-1 p-6">
        <DashboardClient />
      </div>
    </main>
  );
}
