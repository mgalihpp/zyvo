import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteUser } from "@/features/auth/lib/auth-client";

const schema = z.object({
  password: z.string().min(1, "Masukkan kata sandi"),
});

export default function DeleteAccountForm({
  onClose,
  onDeleted,
}: {
  onClose: () => void;
  onDeleted: () => void;
}) {
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  const submit = async (data: z.input<typeof schema>) => {
    const { error } = await deleteUser({ password: data.password });
    if (error) {
      form.setError("password", {
        message: error.message ?? "Kata sandi salah",
      });
      return;
    }
    onDeleted();
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="mt-3 space-y-4">
      <p className="text-sm text-muted-foreground">
        Tindakan ini permanen. Semua data Anda akan dihapus. Masukkan kata sandi
        untuk mengonfirmasi.
      </p>
      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Kata sandi</FieldLabel>
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
      <div className="flex gap-2">
        <Button
          type="submit"
          className="rounded-full bg-destructive px-6 text-white hover:bg-destructive/80"
          loading={form.formState.isSubmitting}
          loadingText="Menghapus…"
        >
          Hapus Akun
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
