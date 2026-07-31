"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { JobApplication } from "@prisma/client";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  type BoardColumn,
  workTypeSchema,
} from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

// Form-level schema: dates and salaries come from native inputs as strings.
// Converted to the tRPC input shape on submit.
const formSchema = z.object({
  company: z.string().min(1, "Nama perusahaan wajib diisi").max(160),
  position: z.string().min(1, "Posisi wajib diisi").max(160),
  columnId: z.string().min(1),
  jobUrl: z
    .union([z.url("URL tidak valid").max(2000), z.literal("")])
    .optional(),
  location: z.string().max(160).optional(),
  workType: z.union([workTypeSchema, z.literal("")]).optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  cvId: z.string().optional(),
  followUpDate: z.string().optional(),
  appliedAt: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function toDateInput(value: Date | string | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function parseSalary(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

function toPayload(values: FormValues) {
  return {
    company: values.company,
    position: values.position,
    jobUrl: values.jobUrl ?? "",
    location: values.location || undefined,
    workType: values.workType || undefined,
    salaryMin: parseSalary(values.salaryMin),
    salaryMax: parseSalary(values.salaryMax),
    cvId: values.cvId || undefined,
    followUpDate: values.followUpDate
      ? new Date(values.followUpDate)
      : undefined,
    appliedAt: values.appliedAt ? new Date(values.appliedAt) : undefined,
    notes: values.notes || undefined,
  };
}

function defaultsFor(
  application: JobApplication | undefined,
  defaultColumnId: string,
): FormValues {
  if (!application) {
    return {
      company: "",
      position: "",
      columnId: defaultColumnId,
      jobUrl: "",
      location: "",
      workType: "",
      salaryMin: "",
      salaryMax: "",
      cvId: "",
      followUpDate: "",
      appliedAt: toDateInput(new Date()),
      notes: "",
    };
  }
  return {
    company: application.company,
    position: application.position,
    columnId: application.columnId,
    jobUrl: application.jobUrl ?? "",
    location: application.location ?? "",
    workType: (application.workType ?? "") as FormValues["workType"],
    salaryMin: application.salaryMin?.toString() ?? "",
    salaryMax: application.salaryMax?.toString() ?? "",
    cvId: application.cvId ?? "",
    followUpDate: toDateInput(application.followUpDate),
    appliedAt: toDateInput(application.appliedAt),
    notes: application.notes ?? "",
  };
}

export function ApplicationDialog({
  open,
  onOpenChange,
  columns,
  defaultColumnId,
  application,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: BoardColumn[];
  defaultColumnId: string;
  application?: JobApplication;
}) {
  const utils = trpc.useUtils();
  const isEdit = Boolean(application);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: cvs } = trpc.cv.list.useQuery(undefined, { enabled: open });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultsFor(application, defaultColumnId),
  });

  // Reset form when the dialog opens for a different application / mode.
  useEffect(() => {
    if (open) form.reset(defaultsFor(application, defaultColumnId));
  }, [open, application, defaultColumnId, form]);

  function onSuccess(message: string) {
    utils.jobTracker.getBoard.invalidate();
    utils.jobTracker.getStats.invalidate();
    toast.add({ title: message });
    onOpenChange(false);
  }

  const createMutation = trpc.jobTracker.createApplication.useMutation({
    onSuccess: () => onSuccess("Lamaran ditambahkan"),
    onError: (err) => toast.add({ title: err.message }),
  });
  const updateMutation = trpc.jobTracker.updateApplication.useMutation({
    onSuccess: () => onSuccess("Lamaran diperbarui"),
    onError: (err) => toast.add({ title: err.message }),
  });
  const deleteMutation = trpc.jobTracker.deleteApplication.useMutation({
    onSuccess: () => {
      setConfirmDelete(false);
      onSuccess("Lamaran dihapus");
    },
    onError: (err) => toast.add({ title: err.message }),
  });

  const submit = (values: FormValues) => {
    const payload = toPayload(values);
    if (isEdit && application) {
      updateMutation.mutate({ id: application.id, data: payload });
    } else {
      createMutation.mutate({ ...payload, columnId: values.columnId });
    }
  };

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Lamaran" : "Tambah Lamaran"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(submit)}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="company"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Perusahaan</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="position"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Posisi</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              name="columnId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <NativeSelect className="w-full" {...field} id={field.name}>
                    {sortedColumns.map((col) => (
                      <NativeSelectOption key={col.id} value={col.id}>
                        {col.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="jobUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>URL Lowongan</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="url"
                    placeholder="https://"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="location"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Lokasi</FieldLabel>
                    <Input {...field} id={field.name} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="workType"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Tipe Kerja</FieldLabel>
                    <NativeSelect className="w-full" {...field} id={field.name}>
                      <NativeSelectOption value="">—</NativeSelectOption>
                      <NativeSelectOption value="remote">
                        Remote
                      </NativeSelectOption>
                      <NativeSelectOption value="hybrid">
                        Hybrid
                      </NativeSelectOption>
                      <NativeSelectOption value="onsite">
                        Onsite
                      </NativeSelectOption>
                    </NativeSelect>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="salaryMin"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Gaji Min (Rp)</FieldLabel>
                    <Input {...field} id={field.name} type="number" min={0} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="salaryMax"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Gaji Max (Rp)</FieldLabel>
                    <Input {...field} id={field.name} type="number" min={0} />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              name="cvId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>CV yang Dipakai</FieldLabel>
                  <NativeSelect className="w-full" {...field} id={field.name}>
                    <NativeSelectOption value="">Tanpa CV</NativeSelectOption>
                    {cvs?.map((cv) => (
                      <NativeSelectOption key={cv.id} value={cv.id}>
                        {cv.title}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="appliedAt"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Tanggal Melamar
                    </FieldLabel>
                    <Input {...field} id={field.name} type="date" />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="followUpDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Tanggal Follow-up
                    </FieldLabel>
                    <Input {...field} id={field.name} type="date" />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              name="notes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Catatan</FieldLabel>
                  <Textarea {...field} id={field.name} rows={3} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="flex items-center justify-between gap-2">
              {isEdit ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  Hapus
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                  loadingText="Menyimpan..."
                >
                  Simpan
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus lamaran ini?</DialogTitle>
            <DialogDescription>
              Lamaran &quot;{application?.position}&quot; di{" "}
              {application?.company} akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteMutation.isPending}
              loadingText="Menghapus..."
              onClick={() => {
                if (application) deleteMutation.mutate({ id: application.id });
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
