"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { signIn, signUp } from "@/lib/auth-client";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth-routes";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignUpPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.input<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const handleSubmit = (data: z.input<typeof signUpSchema>) => {
    startTransition(async () => {
      const { error } = await signUp.email(data);
      if (error) return;
      // Proxy allows the now-authenticated request through to the app.
      router.push(DEFAULT_AUTH_REDIRECT);
      router.refresh();
    });
  };

  const handleGoogle = () => {
    signIn.social({ provider: "google", callbackURL: DEFAULT_AUTH_REDIRECT });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Sign up with email or Google</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="John Doe"
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
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    aria-invalid={fieldState.invalid}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
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
              Sign up
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
              href="/signin"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Already have an account? Sign in
            </a>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
