"use client";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  PlusIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AiToolbar } from "@/features/ai/components/ai-toolbar";
import {
  type CertificationInput,
  type CustomInput,
  type EducationInput,
  type ExperienceInput,
  emptyCertification,
  emptyCustom,
  emptyEducation,
  emptyExperience,
  emptyInterpersonal,
  emptyLanguage,
  emptyOrganization,
  emptyProject,
  emptySkill,
  type InterpersonalInput,
  type LanguageInput,
  type OrganizationInput,
  type ProjectInput,
  type SkillInput,
} from "@/features/cv/schemas/cv";
import type { EditorSection } from "@/features/cv/stores/cv-store";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { InfoBanner, TipsBanner } from "./_ai-tools";

const SECTION_TITLES: Record<EditorSection, string> = {
  summary: "Profil",
  experience: "Pengalaman",
  education: "Pendidikan",
  skills: "Keahlian",
  interpersonal: "Keahlian Interpersonal",
  languages: "Bahasa",
  certifications: "Sertifikasi",
  organizations: "Organisasi",
  projects: "Proyek",
  custom: "Kustom",
};

/** Sections shown with the info banner instead of the tips + AI toolbar. */
const LEVEL_SECTIONS: ReadonlySet<EditorSection> = new Set([
  "skills",
  "interpersonal",
  "languages",
]);

const LEVEL_LABELS = [
  "Pemula",
  "Dasar",
  "Menengah",
  "Lanjutan",
  "Mahir",
] as const;

/** Character-counted textarea: enforces maxLength and shows a live counter. */
function CharCountTextarea({
  maxLength,
  value,
  onChange,
  ...props
}: React.ComponentProps<typeof Textarea> & { maxLength: number }) {
  return (
    <div>
      <Textarea
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        {...props}
      />
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {String(value ?? "").length}/{maxLength}
      </p>
    </div>
  );
}

/** Dialog that edits the section referenced by the store's editorTarget. */
export function EditorDialog() {
  const target = useCvStore((s) => s.editorTarget);
  const closeEditor = useCvStore((s) => s.closeEditor);

  const title = target ? SECTION_TITLES[target.section] : "";

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) closeEditor();
      }}
      // Keep focus trapped in the dialog but leave the page (body) scrollable.
      modal="trap-focus"
    >
      <DialogContent className="sm:max-w-2xl" scrollable>
        <DialogHeader>
          <DialogTitle className="text-base">
            {target?.mode === "add" ? `Tambah ${title}` : title}
          </DialogTitle>
        </DialogHeader>

        {target ? (
          // Remount when the target changes so add-mode drafts reset cleanly.
          <EditorBody
            key={`${target.section}-${target.mode}-${target.index ?? "new"}`}
            section={target.section}
            mode={target.mode}
            index={target.index}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({
  section,
  mode,
  index,
}: {
  section: EditorSection;
  mode: "add" | "edit";
  index: number | null;
}) {
  const isLevel = LEVEL_SECTIONS.has(section);

  const banner = isLevel ? (
    <InfoBanner>
      Anda dapat menampilkan/menyembunyikan tingkat keahlian melalui{" "}
      <span className="font-medium text-primary">Menu Penyesuaian</span>. Cek
      atau uncek opsi{" "}
      <span className="font-medium">tampilkan tingkat keahlian</span>.
    </InfoBanner>
  ) : section !== "summary" ? (
    <TipsBanner />
  ) : null;

  if (section === "summary") {
    return <SummaryBody />;
  }

  return (
    <SectionBody section={section} mode={mode} index={index} banner={banner} />
  );
}

/** Summary is a singleton edited live; no draft/commit flow needed. */
function SummaryBody() {
  const summary = useCvStore((s) => s.summary);
  const setSummary = useCvStore((s) => s.setSummary);
  const closeEditor = useCvStore((s) => s.closeEditor);

  return (
    <>
      <div className="space-y-4">
        <TipsBanner />
        <Field>
          <FieldLabel htmlFor="summary">Profil</FieldLabel>
          <CharCountTextarea
            id="summary"
            maxLength={3000}
            rows={8}
            value={summary ?? ""}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Paragraf singkat yang merangkum pengalaman, keunggulan, dan tujuan karier Anda."
          />
        </Field>
        <AiToolbar
          fieldType="ringkasan"
          value={summary ?? ""}
          onChange={setSummary}
        />
      </div>
      <DialogFooter className="sm:flex-col">
        <Button
          type="button"
          className="w-full"
          onClick={closeEditor}
          size="lg"
        >
          Perbarui
        </Button>
      </DialogFooter>
    </>
  );
}

/** Props each per-section form receives so it can work with draft or store. */
interface FormProps<T> {
  value: T;
  onChange: (patch: Partial<T>) => void;
}

type ListSection = Exclude<EditorSection, "summary">;

/** Static config binding a section to its empty value, add, and update fns. */
function useSectionConfig(section: ListSection) {
  const store = useCvStore((s) => s);

  const config = {
    experience: {
      empty: emptyExperience,
      add: store.addExperience,
      update: store.updateExperience,
      item: store.experience,
      Form: ExperienceForm,
    },
    education: {
      empty: emptyEducation,
      add: store.addEducation,
      update: store.updateEducation,
      item: store.education,
      Form: EducationForm,
    },
    skills: {
      empty: emptySkill,
      add: store.addSkill,
      update: store.updateSkill,
      item: store.skills,
      Form: SkillForm,
    },
    interpersonal: {
      empty: emptyInterpersonal,
      add: store.addInterpersonal,
      update: store.updateInterpersonal,
      item: store.interpersonal,
      Form: InterpersonalForm,
    },
    languages: {
      empty: emptyLanguage,
      add: store.addLanguage,
      update: store.updateLanguage,
      item: store.languages,
      Form: LanguageForm,
    },
    certifications: {
      empty: emptyCertification,
      add: store.addCertification,
      update: store.updateCertification,
      item: store.certifications,
      Form: CertificationForm,
    },
    organizations: {
      empty: emptyOrganization,
      add: store.addOrganization,
      update: store.updateOrganization,
      item: store.organizations,
      Form: OrganizationForm,
    },
    projects: {
      empty: emptyProject,
      add: store.addProject,
      update: store.updateProject,
      item: store.projects,
      Form: ProjectForm,
    },
    custom: {
      empty: emptyCustom,
      add: store.addCustom,
      update: store.updateCustom,
      item: store.custom,
      Form: CustomForm,
    },
  } as const;

  return config[section];
}

function SectionBody({
  section,
  mode,
  index,
  banner,
}: {
  section: ListSection;
  mode: "add" | "edit";
  index: number | null;
  banner: React.ReactNode;
}) {
  const cfg = useSectionConfig(section);
  const closeEditor = useCvStore((s) => s.closeEditor);

  const editing = mode === "edit" && index !== null;

  // In add mode we keep a list of not-yet-committed drafts. Each entry has a
  // stable id so React can key the rows correctly across add/remove.
  const [drafts, setDrafts] = useState<
    { id: number; value: Record<string, unknown> }[]
  >(() => [{ id: 0, value: { ...cfg.empty } }]);
  const [nextId, setNextId] = useState(1);

  const storeItem = editing ? cfg.item[index] : undefined;

  // In edit mode, if the item vanished (e.g. removed elsewhere), close.
  if (editing && !storeItem) return null;

  const Form = cfg.Form;
  const sectionTitle = SECTION_TITLES[section];

  // ── Edit mode: single live form bound to the store item. ──────────────────
  if (editing && index !== null) {
    return (
      <>
        <div className="space-y-4">
          {banner}
          <Form
            // biome-ignore lint/suspicious/noExplicitAny: item matches form shape
            value={storeItem as any}
            // biome-ignore lint/suspicious/noExplicitAny: patch matches item shape
            onChange={(patch: any) => cfg.update(index, patch)}
          />
        </div>

        <DialogFooter className="sm:flex-col">
          <Button
            type="button"
            className="w-full"
            onClick={closeEditor}
            size="lg"
          >
            Simpan
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Add mode: one or more draft forms committed together on confirm. ───────
  function updateDraft(id: number, patch: Record<string, unknown>) {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, value: { ...d.value, ...patch } } : d,
      ),
    );
  }

  function addDraft() {
    setDrafts((prev) => [...prev, { id: nextId, value: { ...cfg.empty } }]);
    setNextId((n) => n + 1);
  }

  function removeDraft(id: number) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function handleConfirm() {
    for (const d of drafts) {
      // biome-ignore lint/suspicious/noExplicitAny: draft matches item shape
      cfg.add(d.value as any);
    }
    closeEditor();
  }

  return (
    <>
      <div className="space-y-4">
        {banner}

        {drafts.map((d, i) => (
          <div key={d.id} className={i > 0 ? "border-t pt-4" : undefined}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Form
                  // biome-ignore lint/suspicious/noExplicitAny: draft matches form shape
                  value={d.value as any}
                  onChange={(patch: Record<string, unknown>) =>
                    updateDraft(d.id, patch)
                  }
                />
              </div>
              {drafts.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-6 shrink-0"
                  onClick={() => removeDraft(d.id)}
                  aria-label="Hapus form"
                >
                  <CircleMinusIcon className="text-muted-foreground" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <DialogFooter className="flex-col sm:flex-col">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={addDraft}
        >
          <PlusIcon data-icon="inline-start" />
          Tambah {sectionTitle}
        </Button>
        <Button
          type="button"
          className="w-full"
          onClick={handleConfirm}
          size="lg"
          disabled={drafts.length === 0}
        >
          Tambah
        </Button>
      </DialogFooter>
    </>
  );
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** Date input with a free-text field plus a month-year picker popover. */
function DateField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  variant="secondary"
                  aria-label="Pilih bulan & tahun"
                  disabled={disabled}
                >
                  <CalendarIcon />
                </InputGroupButton>
              }
            />
            <PopoverContent className="w-auto p-3" align="end">
              {/* Year navigation */}
              <div className="mb-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setPickerYear((y) => y - 1)}
                  aria-label="Tahun sebelumnya"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-sm font-medium">{pickerYear}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setPickerYear((y) => y + 1)}
                  aria-label="Tahun berikutnya"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES_ID.map((monthName, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      onChange(`${monthName} ${pickerYear}`);
                      setOpen(false);
                    }}
                  >
                    {monthName.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

function ExperienceForm({ value, onChange }: FormProps<ExperienceInput>) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Posisi</FieldLabel>
          <Input
            value={value.role}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="Frontend Engineer"
          />
        </Field>
        <Field>
          <FieldLabel>Perusahaan</FieldLabel>
          <Input
            value={value.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="Acme Inc."
          />
        </Field>
        <DateField
          label="Mulai"
          value={value.startDate ?? ""}
          onChange={(v) => onChange({ startDate: v })}
          placeholder="Jan 2022"
        />
        <DateField
          label="Selesai"
          value={value.current ? "Sekarang" : (value.endDate ?? "")}
          onChange={(v) => onChange({ endDate: v, current: false })}
          placeholder="Sekarang"
          disabled={!!value.current}
        />
        <Label className="col-span-2 -mt-2 text-muted-foreground">
          <Checkbox
            checked={!!value.current}
            onCheckedChange={(checked) =>
              onChange({
                current: !!checked,
                endDate: checked ? "" : (value.endDate ?? ""),
              })
            }
          />
          Saya masih bekerja di posisi ini
        </Label>
        <Field>
          <FieldLabel>Alamat</FieldLabel>
          <Input
            value={value.location ?? ""}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Jakarta, Indonesia"
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Deskripsi</FieldLabel>
        <CharCountTextarea
          rows={6}
          maxLength={2000}
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Jelaskan tanggung jawab dan pencapaian Anda. Gunakan poin-poin atau kalimat singkat."
        />
        <AiToolbar
          fieldType="deskripsi pengalaman"
          value={value.description ?? ""}
          onChange={(v) => onChange({ description: v })}
        />
      </Field>
    </div>
  );
}

function EducationForm({ value, onChange }: FormProps<EducationInput>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Institusi</FieldLabel>
        <Input
          value={value.school}
          onChange={(e) => onChange({ school: e.target.value })}
          placeholder="Universitas Indonesia"
        />
      </Field>
      <Field>
        <FieldLabel>Gelar</FieldLabel>
        <Input
          value={value.degree ?? ""}
          onChange={(e) => onChange({ degree: e.target.value })}
          placeholder="Sarjana"
        />
      </Field>
      <Field>
        <FieldLabel>Bidang Studi</FieldLabel>
        <Input
          value={value.field ?? ""}
          onChange={(e) => onChange({ field: e.target.value })}
          placeholder="Sistem Informasi"
        />
      </Field>
      <Field>
        <FieldLabel>IPK</FieldLabel>
        <Input
          value={value.gpa ?? ""}
          onChange={(e) => onChange({ gpa: e.target.value })}
          placeholder="3.80 / 4.00"
        />
      </Field>
      <DateField
        label="Mulai"
        value={value.startDate ?? ""}
        onChange={(v) => onChange({ startDate: v })}
        placeholder="2020"
      />
      <DateField
        label="Selesai"
        value={value.endDate ?? ""}
        onChange={(v) => onChange({ endDate: v })}
        placeholder="2024"
      />
    </div>
  );
}

function SkillForm({ value, onChange }: FormProps<SkillInput>) {
  const level = value.level ?? 3;
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Keahlian</FieldLabel>
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Web design"
        />
      </Field>
      <Field>
        <FieldLabel>
          Tingkat{" "}
          <span className="font-normal text-muted-foreground">
            ({level} = {LEVEL_LABELS[level - 1]})
          </span>
        </FieldLabel>
        <div className="pt-2">
          <Slider
            min={1}
            max={5}
            value={[level]}
            onValueChange={(v) =>
              onChange({ level: Array.isArray(v) ? v[0] : v })
            }
          />
        </div>
      </Field>
    </div>
  );
}

function InterpersonalForm({ value, onChange }: FormProps<InterpersonalInput>) {
  return (
    <Field>
      <FieldLabel>Keahlian Interpersonal</FieldLabel>
      <Input
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Komunikasi"
      />
    </Field>
  );
}

function LanguageForm({ value, onChange }: FormProps<LanguageInput>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Bahasa</FieldLabel>
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Bahasa Inggris"
        />
      </Field>
      <Field>
        <FieldLabel>Tingkat</FieldLabel>
        <Input
          value={value.level ?? ""}
          onChange={(e) => onChange({ level: e.target.value })}
          placeholder="Fasih"
        />
      </Field>
    </div>
  );
}

function CertificationForm({ value, onChange }: FormProps<CertificationInput>) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Nama</FieldLabel>
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="AWS Certified Developer"
          />
        </Field>
        <Field>
          <FieldLabel>Diterima Dari</FieldLabel>
          <Input
            value={value.issuer ?? ""}
            onChange={(e) => onChange({ issuer: e.target.value })}
            placeholder="Amazon Web Services"
          />
        </Field>
        <DateField
          label="Tanggal"
          value={value.date ?? ""}
          onChange={(v) => onChange({ date: v })}
          placeholder="Mei 2024"
        />
        <Field>
          <FieldLabel>Link</FieldLabel>
          <Input
            value={value.url ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="credly.com/badges/..."
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Deskripsi</FieldLabel>
        <CharCountTextarea
          rows={5}
          maxLength={2000}
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Rincian singkat mengenai sertifikasi ini."
        />
        <AiToolbar
          fieldType="deskripsi sertifikasi"
          value={value.description ?? ""}
          onChange={(v) => onChange({ description: v })}
        />
      </Field>
    </div>
  );
}

function OrganizationForm({ value, onChange }: FormProps<OrganizationInput>) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Nama</FieldLabel>
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Himpunan Mahasiswa"
          />
        </Field>
        <DateField
          label="Tanggal"
          value={value.date ?? ""}
          onChange={(v) => onChange({ date: v })}
          placeholder="2022"
        />
      </div>
      <Field>
        <FieldLabel>Posisi</FieldLabel>
        <Input
          value={value.role ?? ""}
          onChange={(e) => onChange({ role: e.target.value })}
          placeholder="Ketua Divisi"
        />
      </Field>
      <Field>
        <FieldLabel>Deskripsi</FieldLabel>
        <CharCountTextarea
          rows={5}
          maxLength={2000}
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Jelaskan peran dan kontribusi Anda."
        />
        <AiToolbar
          fieldType="deskripsi organisasi"
          value={value.description ?? ""}
          onChange={(v) => onChange({ description: v })}
        />
      </Field>
    </div>
  );
}

function ProjectForm({ value, onChange }: FormProps<ProjectInput>) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Nama</FieldLabel>
          <Input
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Website Portofolio"
          />
        </Field>
        <Field>
          <FieldLabel>Jenis</FieldLabel>
          <Input
            value={value.type ?? ""}
            onChange={(e) => onChange({ type: e.target.value })}
            placeholder="Aplikasi Web"
          />
        </Field>
        <DateField
          label="Tanggal"
          value={value.date ?? ""}
          onChange={(v) => onChange({ date: v })}
          placeholder="2024"
        />
        <Field>
          <FieldLabel>Keahlian</FieldLabel>
          <Input
            value={value.skill ?? ""}
            onChange={(e) => onChange({ skill: e.target.value })}
            placeholder="React, Node.js"
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Deskripsi</FieldLabel>
        <CharCountTextarea
          rows={5}
          maxLength={2000}
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Apa yang dilakukan proyek ini dan peran Anda di dalamnya."
        />
        <AiToolbar
          fieldType="deskripsi proyek"
          value={value.description ?? ""}
          onChange={(v) => onChange({ description: v })}
        />
      </Field>
    </div>
  );
}

function CustomForm({ value, onChange }: FormProps<CustomInput>) {
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel>Judul</FieldLabel>
        <Input
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Penghargaan / Publikasi / dll."
        />
      </Field>
      <Field>
        <FieldLabel>Deskripsi</FieldLabel>
        <CharCountTextarea
          rows={5}
          maxLength={2000}
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Rincian tambahan."
        />
        <AiToolbar
          fieldType="deskripsi"
          value={value.description ?? ""}
          onChange={(v) => onChange({ description: v })}
        />
      </Field>
    </div>
  );
}
