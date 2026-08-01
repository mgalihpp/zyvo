"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { JobApplication } from "@prisma/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  type BoardColumn,
  workTypeSchema,
} from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

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
  jobDescription: z.string().max(3000).optional(),
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
    jobDescription: values.jobDescription || undefined,
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
      jobDescription: "",
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
    jobDescription: application.jobDescription ?? "",
  };
}

/** Value picker built on DropdownMenu — button trigger + radio items. */
function DropdownSelectField({
  id,
  value,
  onChange,
  placeholder,
  options,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  invalid?: boolean;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground",
            )}
          />
        }
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDownIcon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** shadcn date picker (Popover + Calendar) storing the value as "yyyy-MM-dd". */
function DatePickerField({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn(
              "w-full justify-start font-normal",
              !selected && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" aria-hidden="true" />
        {selected
          ? format(selected, "d MMMM yyyy", { locale: localeId })
          : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={localeId}
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
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
    toast.add({ title: message, type: "success" });
    onOpenChange(false);
  }

  const createMutation = trpc.jobTracker.createApplication.useMutation({
    onSuccess: () => onSuccess("Lamaran ditambahkan"),
    onError: (err) => toast.add({ title: err.message, type: "error" }),
  });
  const updateMutation = trpc.jobTracker.updateApplication.useMutation({
    onSuccess: () => onSuccess("Lamaran diperbarui"),
    onError: (err) => toast.add({ title: err.message, type: "error" }),
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Lamaran" : "Tambah Lamaran"}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="space-y-4 px-6 pb-6"
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
                    placeholder="cth. PT Maju Jaya"
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
                    placeholder="cth. Frontend Developer"
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
                <DropdownSelectField
                  id={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pilih status"
                  invalid={fieldState.invalid}
                  options={sortedColumns.map((col) => ({
                    value: col.id,
                    label: col.name,
                  }))}
                />
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
                  placeholder="https://contoh.com/lowongan"
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
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="cth. Jakarta"
                  />
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
                  <DropdownSelectField
                    id={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Pilih tipe kerja"
                    invalid={fieldState.invalid}
                    options={[
                      { value: "", label: "—" },
                      { value: "remote", label: "Remote" },
                      { value: "hybrid", label: "Hybrid" },
                      { value: "onsite", label: "Onsite" },
                    ]}
                  />
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
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="cth. 8000000"
                  />
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
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={0}
                    placeholder="cth. 12000000"
                  />
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
                <DropdownSelectField
                  id={field.name}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pilih CV (opsional)"
                  invalid={fieldState.invalid}
                  options={[
                    { value: "", label: "Tanpa CV" },
                    ...(cvs?.map((cv) => ({
                      value: cv.id,
                      label: cv.title,
                    })) ?? []),
                  ]}
                />
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
                  <FieldLabel htmlFor={field.name}>Tanggal Melamar</FieldLabel>
                  <DatePickerField
                    id={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pilih tanggal"
                    invalid={fieldState.invalid}
                  />
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
                  <DatePickerField
                    id={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pilih tanggal (opsional)"
                    invalid={fieldState.invalid}
                  />
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
                <Textarea
                  {...field}
                  id={field.name}
                  rows={3}
                  placeholder="cth. Referral dari teman, interview tahap 2 minggu depan..."
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="jobDescription"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Deskripsi Lowongan</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  rows={4}
                  placeholder="Paste deskripsi lowongan di sini — dipakai untuk fitur AI (opsional)"
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex items-center justify-end gap-2">
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
        </form>
      </SheetContent>
    </Sheet>
  );
}
