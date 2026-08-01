"use client";

import { CheckIcon, FileDownIcon, FileImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CvThumbnail } from "@/features/cv/components/dashboard/cv-thumbnail";
import { SAMPLE_CV } from "@/features/cv/components/templates/sample";
import {
  templateDefaultColors,
  templateDefaultTypography,
} from "@/features/cv/components/templates/template-colors";
import { cn } from "@/lib/utils";

/**
 * Self-contained previews for the cara-kerja section. They mirror the real
 * product screens (onboarding template gallery, builder data form, export
 * panel) as clean full-width mockups — no fake browser/editor chrome. Renders
 * real CV templates via CvThumbnail but is hardcoded: no CV store, no tRPC.
 */

function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return i;
}

function sampleCvFor(templateId: string) {
  return {
    ...SAMPLE_CV,
    templateId,
    colors: templateDefaultColors(templateId),
    typography: templateDefaultTypography(templateId),
  };
}

function SaveChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[0.6rem] font-medium text-emerald-600 dark:text-emerald-500">
      <CheckIcon className="size-3" />
      Tersimpan
    </span>
  );
}

const STEP2_TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
  { id: "elegant", label: "Elegant" },
];

/** Step 1 — mirrors the onboarding "Pilih template" gallery. */
function TemplateScreen() {
  const active = useCycle(STEP2_TEMPLATES.length, 2200);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {["Semua", "Profesional", "Modern", "Minimal"].map((chip, i) => (
          <span
            key={chip}
            className={cn(
              "rounded-full border px-3 py-1 text-[0.65rem] font-medium transition-colors",
              i === 0
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="grid w-full max-w-2xl grid-cols-3 gap-3 sm:grid-cols-4 lg:gap-4">
        {STEP2_TEMPLATES.map((tpl, i) => (
          <div key={tpl.id} className="space-y-1.5">
            <div
              className={cn(
                "overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-300",
                i === active
                  ? "border-primary ring-2 ring-primary"
                  : "border-border",
              )}
            >
              <CvThumbnail
                cv={sampleCvFor(tpl.id)}
                className="w-full"
                aspectRatio="1 / 1.414"
              />
            </div>
            <p className="text-center text-[0.6rem] uppercase tracking-wide text-muted-foreground">
              {tpl.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockField({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.6rem] font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-0.5 flex h-7 items-center rounded-md border bg-background px-2.5 text-xs text-foreground shadow-sm transition-colors",
          active ? "border-primary ring-1 ring-primary/30" : "border-border",
        )}
      >
        <span className="truncate">{value}</span>
        {active && <span className="ml-1 h-3 w-px animate-pulse bg-primary" />}
      </div>
    </div>
  );
}

const PERSONAL_FIELDS = [
  { label: "Nama", value: "Cecily Bakker" },
  { label: "Posisi", value: "Digital Marketing Specialist" },
  { label: "Email", value: "cecily@email.com" },
  { label: "No. HP", value: "+62 812 3456 7890" },
];

/** Step 2 — mirrors the builder data form. */
function DataScreen() {
  const active = useCycle(PERSONAL_FIELDS.length, 1600);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Informasi Pribadi
            </h3>
            <p className="text-[0.65rem] text-muted-foreground">
              Lengkapi data diri Anda.
            </p>
          </div>
          <SaveChip />
        </div>
        <div className="space-y-3">
          {PERSONAL_FIELDS.map((field, i) => (
            <MockField
              key={field.label}
              label={field.label}
              value={field.value}
              active={i === active}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const EXPORT_FORMATS = [
  {
    icon: FileDownIcon,
    label: "Unduh PDF",
    subtitle: "Format dokumen, cocok untuk dicetak",
    iconClass: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
  {
    icon: FileImageIcon,
    label: "Unduh PNG",
    subtitle: "Format gambar, cocok dibagikan online",
    iconClass:
      "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
];

/** Step 3 — mirrors the real ExportPanel. */
function ExportScreen() {
  const [which, setWhich] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    let phase = 0;
    const id = setInterval(() => {
      phase += 1;
      if (phase % 2 === 1) {
        setBusy(true);
      } else {
        setBusy(false);
        setWhich((w) => (w + 1) % EXPORT_FORMATS.length);
      }
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const fmt = EXPORT_FORMATS[which];
  const Icon = fmt.icon;
  const Other = EXPORT_FORMATS[1 - which].icon;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.35)]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Unduh</h3>
          <p className="text-[0.65rem] text-muted-foreground">
            Perubahan tersimpan otomatis.
          </p>
        </div>
        <div className="space-y-2.5">
          <div
            className={cn(
              "flex items-start gap-2.5 rounded-lg border bg-background p-3 shadow-sm transition-all duration-300",
              busy ? "ring-2 ring-emerald-500/40" : "border-border",
            )}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-inner",
                busy
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                  : fmt.iconClass,
              )}
            >
              {busy ? (
                <CheckIcon className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {busy ? "Berhasil diunduh" : fmt.label}
              </p>
              <p className="mt-0.5 truncate text-[0.6rem] text-muted-foreground">
                {busy ? "cv-saya.pdf" : fmt.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3 shadow-sm opacity-60">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-inner",
                EXPORT_FORMATS[1 - which].iconClass,
              )}
            >
              <Other className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {EXPORT_FORMATS[1 - which].label}
              </p>
              <p className="mt-0.5 truncate text-[0.6rem] text-muted-foreground">
                {EXPORT_FORMATS[1 - which].subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.6rem] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckIcon className="size-3" />
        Lolos pemindaian ATS
      </span>
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
