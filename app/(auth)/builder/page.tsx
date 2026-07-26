import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { SignOutButton } from "./sign-out-button";

export default async function BuilderPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <main className="flex min-h-screen flex-col p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">CV Builder</h1>
        <SignOutButton />
      </header>

      <div className="mt-8 flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Builder coming soon…</p>
      </div>
    </main>
  );
}
