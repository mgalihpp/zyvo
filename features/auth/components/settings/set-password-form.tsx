import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc/client";

const schema = z
  .object({
    newPassword: z.string().min(8, "Kata sandi minimal 8 karakter"),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Kata sandi tidak cocok",
    path: ["confirm"],
  });

export default function SetPasswordForm({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const mutation = trpc.account.setPassword.useMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirm: "" },
  });

  const submit = async (data: z.input<typeof schema>) => {
    setError(null);
    try {
      await mutation.mutateAsync({ newPassword: data.newPassword });
      toast.add({ title: "Kata sandi berhasil diatur" });
      onDone();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengatur kata sandi",
      );
    }
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="mt-3 space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      <Controller
        name="newPassword"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Kata sandi baru</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="password"
              aria-invalid={fieldState.invalid}
              autoComplete="new-password"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name="confirm"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Konfirmasi kata sandi</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="password"
              aria-invalid={fieldState.invalid}
              autoComplete="new-password"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          className="rounded-full"
          loading={mutation.isPending}
          loadingText="Menyimpan…"
        >
          Simpan
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onClose}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
