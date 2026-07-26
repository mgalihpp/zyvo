"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { GoogleIcon } from "@/components/google-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth-routes";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const redirectTo = searchParams.get("redirectTo") ?? DEFAULT_AUTH_REDIRECT;

  const form = useForm<z.input<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = (data: z.input<typeof signInSchema>) => {
    startTransition(async () => {
      const { error } = await signIn.email({
        email: data.email,
        password: data.password,
      });
      if (error) return;
      // Proxy allows the now-authenticated request through to the target route.
      router.push(redirectTo);
      router.refresh();
    });
  };

  const handleGoogle = () => {
    signIn.social({ provider: "google", callbackURL: redirectTo });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back — sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
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
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Min 8 characters"
                    autoComplete="current-password"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              loadingText="Please wait..."
              loading={isPending}
            >
              Sign in
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={isPending}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="mt-2 w-full text-center">
            <a
              href="/signup"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Don&apos;t have an account? Sign up
            </a>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-neutral-500">Loading…</p>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
