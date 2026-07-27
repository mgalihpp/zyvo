import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/features/auth/lib/auth";
import { SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";

/** Pengaturan — account info; most sections are placeholders for now. */
export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(SIGN_IN_PATH);

  const { name, email } = session.user;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola akun dan preferensi Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Nama</span>
            <span className="font-medium">{name || "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{email || "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferensi</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Pengaturan lainnya akan segera hadir.
        </CardContent>
      </Card>
    </div>
  );
}
