"use client";

import {
  CheckIcon,
  CloudIcon,
  FileDownIcon,
  FileImageIcon,
  Loader2Icon,
  MapPinIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import { TEMPLATES } from "@/features/cv/components/templates";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cn } from "@/lib/utils";

/** Product-faithful, presentation-only previews. No store or network access. */

function useCycle(length: number, ms: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || length <= 1) return;

    const id = setInterval(
      () => setIndex((current) => (current + 1) % length),
      ms,
    );
    return () => clearInterval(id);
  }, [length, ms]);

  return index;
}

function sampleCvFor(templateId: string) {
  return {
    ...SAMPLE_CV,
    templateId,
    colors: templateDefaultColors(templateId),
    typography: templateDefaultTypography(templateId),
  };
}

const PREVIEW_TEMPLATES = TEMPLATES.slice(0, 4);

function TemplateScreen() {
  const active = useCycle(PREVIEW_TEMPLATES.length, 2400);

  return (
    <div className="relative flex h-full w-full flex-col gap-12 overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_58%)] px-3 py-5 sm:gap-16 sm:px-6">
      <div className="cinematic-stage-glow pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative z-20 flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {["Semua", "ATS", "Profesional", "Satu Kolom"].map((chip, index) => (
          <span
            key={chip}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[0.58rem] font-medium shadow-sm backdrop-blur sm:px-3 sm:text-[0.65rem]",
              index === 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background/80 text-muted-foreground",
            )}
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
        {PREVIEW_TEMPLATES.map((template, index) => {
          const offset =
            (index - active + PREVIEW_TEMPLATES.length) %
            PREVIEW_TEMPLATES.length;
          const position = offset === 0 ? 0 : offset === 1 ? 1 : -1;
          const visible = offset < 2 || offset === PREVIEW_TEMPLATES.length - 1;

          return (
            <div
              key={template.id}
              className={cn(
                "absolute left-1/2 top-1/2 w-[30%] max-w-36 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out motion-reduce:transition-none",
                position === 0 &&
                  "z-20 scale-100 opacity-100 drop-shadow-[0_25px_25px_rgba(30,20,70,0.24)]",
                position === -1 &&
                  "z-10 -translate-x-[112%] -rotate-6 scale-[0.82] opacity-65",
                position === 1 &&
                  "z-10 translate-x-[12%] rotate-6 scale-[0.82] opacity-65",
                !visible && "scale-75 opacity-0",
              )}
            >
              <div
                className={cn(
                  "overflow-hidden rounded-xl border bg-white shadow-xl transition-all duration-700",
                  position === 0
                    ? "border-primary ring-4 ring-primary/15"
                    : "border-white/70",
                )}
              >
                <CvThumbnail
                  cv={sampleCvFor(template.id)}
                  className="w-full"
                  aspectRatio="1 / 1.414"
                />
              </div>
              <p className="mt-2 text-center text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-foreground/70">
                {template.name}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative z-20 mx-auto flex items-center gap-2 rounded-full border border-primary/20 bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur">
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-2.5" />
        </span>
        <span className="text-[0.62rem] font-medium">
          {PREVIEW_TEMPLATES[active].name} dipilih
        </span>
      </div>
    </div>
  );
}

const PERSONAL_FIELDS = [
  { label: "Nama", value: "Cecily Bakker" },
  { label: "Posisi", value: "Digital Marketing Specialist" },
  { label: "Email", value: "cecily@email.com" },
  { label: "No. HP", value: "+62 812 3456 7890" },
  { label: "Alamat", value: "Jakarta, Indonesia" },
];

const SAVE_STATES = {
  changed: { label: "Ada perubahan...", icon: null, tone: "muted" },
  saving: { label: "Menyimpan...", icon: Loader2Icon, tone: "muted" },
  saved: { label: "Tersimpan", icon: CheckIcon, tone: "saved" },
} as const;

type DataAnimationState = {
  fieldIndex: number;
  characterCount: number;
  status: "typing" | keyof typeof SAVE_STATES;
};

function DataScreen() {
  const [animation, setAnimation] = useState<DataAnimationState>({
    fieldIndex: 0,
    characterCount: 0,
    status: "typing",
  });
  const { fieldIndex: activeField, characterCount, status } = animation;
  const saveState =
    status === "typing" ? SAVE_STATES.changed : SAVE_STATES[status];
  const StatusIcon = saveState.icon;

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduce) {
      setAnimation({
        fieldIndex: PERSONAL_FIELDS.length - 1,
        characterCount: PERSONAL_FIELDS.at(-1)?.value.length ?? 0,
        status: "saved",
      });
      return;
    }

    const field = PERSONAL_FIELDS[activeField];
    const isComplete = characterCount >= field.value.length;
    const delay =
      status === "typing"
        ? isComplete
          ? 260
          : 58
        : status === "changed"
          ? 360
          : status === "saving"
            ? 520
            : 720;

    const id = setTimeout(() => {
      if (status === "typing") {
        if (!isComplete) {
          setAnimation((current) => ({
            ...current,
            characterCount: current.characterCount + 1,
          }));
        } else {
          setAnimation((current) => ({ ...current, status: "changed" }));
        }
        return;
      }

      if (status === "changed") {
        setAnimation((current) => ({ ...current, status: "saving" }));
        return;
      }

      if (status === "saving") {
        setAnimation((current) => ({ ...current, status: "saved" }));
        return;
      }

      const nextField = (activeField + 1) % PERSONAL_FIELDS.length;
      setAnimation({
        fieldIndex: nextField,
        characterCount: 0,
        status: "typing",
      });
    }, delay);

    return () => clearTimeout(id);
  }, [activeField, characterCount, status]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_75%_25%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_48%)] p-3 sm:p-6">
      <div className="cinematic-stage-glow pointer-events-none absolute right-8 top-10 size-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-4 shadow-[0_28px_70px_-32px_color-mix(in_oklch,var(--primary)_45%,transparent)] backdrop-blur sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-primary">
              Editor CV
            </p>
            <h3 className="mt-1 text-sm font-semibold text-foreground">
              Informasi Pribadi
            </h3>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-medium transition-colors",
              saveState.tone === "saved"
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {StatusIcon ? (
              <StatusIcon
                className={cn(
                  "size-3",
                  saveState.label === "Menyimpan..." && "animate-spin",
                )}
              />
            ) : null}
            {saveState.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {PERSONAL_FIELDS.map((field, index) => (
            <div
              key={field.label}
              className={cn(
                index === PERSONAL_FIELDS.length - 1 && "col-span-2",
              )}
            >
              <p className="text-[0.58rem] font-medium text-muted-foreground">
                {field.label}
              </p>
              <div
                className={cn(
                  "mt-1 flex h-8 items-center rounded-md border bg-background px-2.5 text-[0.68rem] shadow-sm transition-all duration-500",
                  index === activeField
                    ? "border-primary ring-2 ring-primary/15"
                    : "border-border",
                )}
              >
                <span className="truncate">
                  {index === activeField
                    ? field.value.slice(0, characterCount)
                    : field.value}
                </span>
                {index === activeField ? (
                  <span className="ml-0.5 h-3.5 w-px animate-pulse bg-primary" />
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="cinematic-float absolute -bottom-4 -right-2 hidden items-center gap-2 rounded-xl border bg-background/95 px-3 py-2 shadow-xl backdrop-blur sm:flex">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CloudIcon className="size-3.5" />
          </span>
          <div>
            <p className="text-[0.6rem] font-semibold">Autosave aktif</p>
            <p className="text-[0.52rem] text-muted-foreground">
              Perubahan disimpan otomatis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const EXPORT_FORMATS = [
  {
    id: "pdf",
    icon: FileDownIcon,
    label: "Unduh PDF",
    subtitle: "Format dokumen, cocok untuk dicetak",
    iconClass: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
  {
    id: "png",
    icon: FileImageIcon,
    label: "Unduh PNG",
    subtitle: "Format gambar, cocok untuk dibagikan secara online",
    iconClass:
      "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
] as const;

export function exportPreviewState(phase: number, formatCount: number) {
  return {
    selected: Math.floor(phase / 3) % formatCount,
    status: ["selecting", "preparing", "complete"][phase % 3] as
      | "selecting"
      | "preparing"
      | "complete",
  };
}

function ExportScreen() {
  const phase = useCycle(EXPORT_FORMATS.length * 3, 1600);
  const { selected, status } = exportPreviewState(phase, EXPORT_FORMATS.length);
  const preparing = status === "preparing";
  const complete = status === "complete";
  const selectedFormat = EXPORT_FORMATS[selected];

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_35%_50%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_52%)] p-3 sm:p-6">
      <div className="cinematic-stage-glow pointer-events-none absolute left-10 top-1/2 size-56 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative grid w-full max-w-xl grid-cols-[0.7fr_1.3fr] items-center gap-3 sm:gap-5">
        <div className="cinematic-float relative z-10 -rotate-3 overflow-hidden rounded-xl border border-white/80 bg-white shadow-[0_25px_50px_-20px_rgba(30,20,70,0.4)]">
          <CvThumbnail
            cv={sampleCvFor("classic")}
            className="w-full"
            aspectRatio="1 / 1.414"
          />
          <span className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-background/90 px-2 py-1 text-[0.5rem] font-medium shadow backdrop-blur">
            <MapPinIcon className="size-2.5 text-primary" />
            Versi tersimpan
          </span>
        </div>

        <div className="relative z-20 overflow-hidden rounded-2xl border bg-card/95 shadow-[0_28px_70px_-32px_color-mix(in_oklch,var(--primary)_45%,transparent)] backdrop-blur">
          <div className="border-b p-3 sm:p-4">
            <h3 className="text-sm font-semibold">Unduh</h3>
            <p className="mt-0.5 text-[0.55rem] leading-4 text-muted-foreground sm:text-[0.6rem]">
              Unduh mengambil versi tersimpan terakhir. Perubahan tersimpan
              otomatis beberapa saat setelah Anda mengetik.
            </p>
          </div>
          <div className="grid gap-2 p-3 sm:p-4">
            {EXPORT_FORMATS.map((format, index) => {
              const Icon = format.icon;
              const active = selected === index;
              return (
                <div
                  key={format.id}
                  className={cn(
                    "flex min-h-14 items-center gap-2 rounded-lg border bg-background p-2.5 text-left shadow-sm transition-all duration-300",
                    active && "border-primary/40 ring-2 ring-primary/25",
                    preparing && !active && "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-inner",
                      format.iconClass,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold">
                      {format.label}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[0.5rem] text-muted-foreground sm:text-[0.55rem]">
                      {format.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="relative mt-1 overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-2.5">
              {preparing ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[0.62rem] font-semibold text-primary">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      Menyiapkan {selectedFormat.id.toUpperCase()}...
                    </span>
                    <span className="text-[0.55rem] font-medium text-primary">
                      78%
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/15">
                    <div className="h-full w-[78%] rounded-full bg-primary transition-[width] duration-1000" />
                  </div>
                </>
              ) : complete ? (
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <CheckIcon className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-semibold text-foreground">
                      {selectedFormat.id.toUpperCase()} siap diunduh
                    </p>
                    <p className="text-[0.5rem] text-muted-foreground">
                      File CV Anda sudah dibuat
                    </p>
                  </div>
                  <FileDownIcon className="ml-auto size-4 shrink-0 text-primary" />
                </div>
              ) : (
                <p className="text-[0.58rem] text-muted-foreground">
                  Pilih format untuk mengunduh CV.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepPreviewMock({
  variant,
}: {
  variant: "template" | "data" | "export";
}) {
  if (variant === "template") return <TemplateScreen />;
  if (variant === "data") return <DataScreen />;
  return <ExportScreen />;
}
