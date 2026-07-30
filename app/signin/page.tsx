import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./_components/sign-in-form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun Zyvo Anda.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-neutral-500">Memuat…</p>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
