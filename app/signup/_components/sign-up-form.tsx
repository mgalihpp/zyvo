"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleIcon } from "@/components/google-icon";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/features/auth/lib/auth-client";
import { DEFAULT_AUTH_REDIRECT } from "@/features/auth/lib/auth-routes";

const signUpSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi",
  }),
});

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<z.input<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", acceptTerms: false },
  });

  const handleSubmit = (data: z.input<typeof signUpSchema>) => {
    setAuthError(null);
    startTransition(async () => {
      const { error } = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      if (error) {
        setAuthError(error.message ?? "Gagal membuat akun. Silakan coba lagi.");
        return;
      }
      router.push(DEFAULT_AUTH_REDIRECT);
      router.refresh();
    });
  };

  const handleGoogle = async () => {
    const ok = await form.trigger("acceptTerms");
    if (!ok) return;
    startGoogleTransition(async () => {
      await signIn.social({
        provider: "google",
        callbackURL: DEFAULT_AUTH_REDIRECT,
      });
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <BrandLogo width={120} height={40} className="h-10" />
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Buat Akun</CardTitle>
          <CardDescription>Daftar dengan email atau Google</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {authError && (
              <Alert variant="destructive">
                <AlertTitle>{authError}</AlertTitle>
              </Alert>
            )}

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Nama</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="Nama Lengkap"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    aria-invalid={fieldState.invalid}
                    placeholder="m@example.com"
                    autoComplete="email"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Kata Sandi</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Min. 8 karakter"
                    autoComplete="new-password"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="acceptTerms"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={field.name}
                      name={field.name}
                      ref={field.ref}
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="mt-0.5"
                    />
                    <FieldLabel
                      htmlFor={field.name}
                      className="!block text-[11px] font-normal leading-snug text-muted-foreground"
                    >
                      Saya menyetujui{" "}
                      <Link
                        href="/terms"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        Syarat &amp; Ketentuan
                      </Link>{" "}
                      dan{" "}
                      <Link
                        href="/privacy"
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        Kebijakan Privasi
                      </Link>
                    </FieldLabel>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              loadingText="Harap tunggu..."
              loading={isPending}
            >
              Daftar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Atau</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={isPending || isGooglePending}
            loading={isGooglePending}
            loadingText="Menghubungkan..."
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </Button>

          <div className="mt-2 w-full text-center">
            <a
              href="/signin"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sudah punya akun? Masuk
            </a>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
