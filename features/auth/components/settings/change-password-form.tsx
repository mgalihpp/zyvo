import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { changePassword } from "@/features/auth/lib/auth-client";

const schema = z.object({
  currentPassword: z.string().min(1, "Masukkan kata sandi saat ini"),
  newPassword: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export default function ChangePasswordForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const submit = async (data: z.input<typeof schema>) => {
    const { error } = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      form.setError("currentPassword", {
        message: error.message ?? "Kata sandi saat ini salah",
      });
      return;
    }
    toast.add({ title: "Kata sandi berhasil diubah" });
    onClose();
  };

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="mt-3 space-y-4 rounded-xl border bg-muted/30 p-4"
    >
      <Controller
        name="currentPassword"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Kata sandi saat ini</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="password"
              aria-invalid={fieldState.invalid}
              autoComplete="current-password"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
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
      <div className="flex gap-2">
        <Button
          type="submit"
          className="rounded-full"
          loading={form.formState.isSubmitting}
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
