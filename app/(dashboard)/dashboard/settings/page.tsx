"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useState } from "react";
import { GoogleIcon } from "@/components/google-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasPassword } from "@/features/auth/components/settings/use-has-password";
import { useSession } from "@/features/auth/lib/auth-client";
import { useMounted } from "@/features/auth/lib/use-mounted";
import { useSubscription } from "@/features/billing/hooks/use-billing";
import { PLANS } from "@/features/billing/lib/plans";

const SetPasswordForm = lazy(
  () => import("@/features/auth/components/settings/set-password-form"),
);
const ChangePasswordForm = lazy(
  () => import("@/features/auth/components/settings/change-password-form"),
);
const DeleteAccountForm = lazy(
  () => import("@/features/auth/components/settings/delete-account-form"),
);
const ActiveDevices = lazy(
  () => import("@/features/auth/components/settings/active-devices"),
);

/** Placeholder shown while a lazily-loaded form chunk downloads. */
function FormFallback() {
  return (
    <div className="mt-3 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
    </div>
  );
}

export default function SettingsPage() {
  const mounted = useMounted();
  const { data: session } = useSession();
  const router = useRouter();
  const { hasPassword, refresh } = useHasPassword();
  const { data: sub, isLoading: subLoading } = useSubscription();

  const [open, setOpen] = useState<"set" | "change" | "delete" | null>(null);
  const toggle = (key: "set" | "change" | "delete") =>
    setOpen((cur) => (cur === key ? null : key));

  const user = session?.user;
  const hasGoogle = mounted && !!user?.image;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola akun dan preferensi Anda.
        </p>
      </div>

      {/* My Plans */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Paket Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subLoading ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Anda menggunakan paket{" "}
              <span className="font-semibold text-foreground">
                {sub
                  ? (PLANS[sub.plan as keyof typeof PLANS]?.label ?? sub.plan)
                  : "Gratis"}
              </span>
              .
            </p>
          )}
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/billing" />}
            className="relative overflow-hidden px-6 bg-foreground text-background hover:bg-foreground/90 billing-shine"
          >
            Tingkatkan
          </Button>
        </CardContent>
      </Card>

      {/* Login */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Kelola Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {hasGoogle && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Akun Google</p>
              <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
                <GoogleIcon />
                <span>{user?.email}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold">Email &amp; Kata Sandi</p>
            {hasPassword === null ? (
              <>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-9 w-40 rounded-full" />
              </>
            ) : hasPassword ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Anda dapat masuk dengan email &amp; kata sandi.
                </p>
                {open === "change" ? (
                  <Suspense fallback={<FormFallback />}>
                    <ChangePasswordForm onClose={() => setOpen(null)} />
                  </Suspense>
                ) : (
                  <Button variant="outline" onClick={() => toggle("change")}>
                    Ubah kata sandi
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Tambahkan kata sandi untuk mengaktifkan login dengan email
                  &amp; kata sandi
                </p>
                {open === "set" ? (
                  <Suspense fallback={<FormFallback />}>
                    <SetPasswordForm
                      onClose={() => setOpen(null)}
                      onDone={refresh}
                    />
                  </Suspense>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => toggle("set")}
                  >
                    Atur kata sandi
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Keamanan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kelola preferensi keamanan Anda.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-semibold">Perangkat Aktif</p>
          <Suspense fallback={<FormFallback />}>
            <ActiveDevices />
          </Suspense>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="rounded-2xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Zona Bahaya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasPassword === null ? (
            <>
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </>
          ) : open === "delete" ? (
            <Suspense fallback={<FormFallback />}>
              <DeleteAccountForm
                onClose={() => setOpen(null)}
                onDeleted={() => router.push("/")}
              />
            </Suspense>
          ) : (
            <>
              {!hasPassword && (
                <p className="text-sm text-muted-foreground">
                  Atur kata sandi terlebih dahulu untuk dapat menghapus akun.
                </p>
              )}
              <Button
                className="bg-destructive px-6 text-white hover:bg-destructive/80"
                disabled={!hasPassword}
                onClick={() => toggle("delete")}
              >
                Hapus Akun
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
