"use client";

import {
  BriefcaseIcon,
  CheckIcon,
  FileDownIcon,
  FileImageIcon,
  LanguagesIcon,
  LoaderIcon,
  MousePointer2Icon,
  PenLineIcon,
  ShieldCheckIcon,
  ShrinkIcon,
  SparklesIcon,
  Undo2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PRESETS } from "@/features/cv/lib/color-presets";
import { cn } from "@/lib/utils";

/**
 * Static + lightly-animated mocks of the real Zyvo editor UI. They mirror the
 * actual components (AI toolbar, save indicator, color presets, typography,
 * export panel) but are hardcoded and self-contained so they render on the
 * marketing page without the CV store. Animations are cosmetic and pause under
 * reduced-motion (the loops simply never advance visibly enough to distract).
 */

/** Advances an index on an interval; returns the current step. */
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

const AI_ACTIONS = [
  {
    icon: BriefcaseIcon,
    label: "Formalkan",
    result:
      "Memimpin pengembangan aplikasi web yang meningkatkan efisiensi tim sebesar 30%.",
  },
  {
    icon: ShrinkIcon,
    label: "Persingkat",
    result: "Membangun aplikasi web, efisiensi tim naik 30%.",
  },
  {
    icon: PenLineIcon,
    label: "Perbaiki kalimat",
    result:
      "Mengembangkan aplikasi web yang berhasil meningkatkan efisiensi tim hingga 30%.",
  },
  {
    icon: LanguagesIcon,
    label: "Terjemahkan B. Inggris",
    result: "Built a web app that boosted team efficiency by 30%.",
  },
] as const;

const AI_ORIGINAL = "bikin aplikasi web, tim jadi lebih cepet 30%";

/** Mock of `AiToolbar` — highlights each action in turn and shows its result. */
export function AiToolbarMock() {
  const active = useCycle(AI_ACTIONS.length, 2200);
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-background p-3 text-xs leading-5 shadow-sm">
        <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          Teks kamu
        </p>
        <p className="text-muted-foreground line-through decoration-muted-foreground/40">
          {AI_ORIGINAL}
        </p>
        <div className="my-2 h-px bg-border" />
        <p className="mb-1 flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
          <SparklesIcon className="size-3" />
          {AI_ACTIONS[active].label}
        </p>
        <p
          key={active}
          className="font-medium text-foreground [animation:mock-fade-in_0.4s_ease-out]"
        >
          {AI_ACTIONS[active].result}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm">
          <Undo2Icon className="size-3.5" />
        </span>
        {AI_ACTIONS.map((action, i) => (
          <span
            key={action.label}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-sm transition-all duration-300",
              i === active
                ? "border-primary bg-primary/10 text-primary [animation:mock-pulse_1.4s_ease-out]"
                : "border-border bg-background text-foreground",
            )}
          >
            <action.icon
              className={cn(
                "size-3.5",
                i === active ? "text-primary" : "text-muted-foreground",
              )}
            />
            {action.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const SAVE_STATES = [
  { label: "Perubahan belum disimpan", tone: "muted", icon: "none" },
  { label: "Menyimpan…", tone: "muted", icon: "spin" },
  { label: "Tersimpan", tone: "ok", icon: "check" },
  { label: "Tersimpan", tone: "ok", icon: "check" },
] as const;

/** Mock of `SaveIndicator` cycling dirty → saving → saved. */
export function SaveIndicatorMock() {
  const step = useCycle(SAVE_STATES.length, 1500);
  const state = SAVE_STATES[step];
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs shadow-sm transition-colors",
          state.tone === "ok"
            ? "text-green-600 dark:text-green-500"
            : "text-muted-foreground",
        )}
      >
        {state.icon === "spin" && (
          <LoaderIcon className="size-3.5 animate-spin" />
        )}
        {state.icon === "check" && <CheckIcon className="size-3.5" />}
        {state.icon === "none" && (
          <span className="size-1.5 rounded-full bg-current" />
        )}
        {state.label}
      </span>
    </div>
  );
}

const PRESET_LABELS: Record<string, string> = {
  professional: "Profesional",
  modern: "Modern",
  colorful: "Berwarna",
  dark: "Gelap",
  neutral: "Netral",
};

/** Mock of the `ColorsPanel` preset grid — the selected preset cycles. */
export function ColorPresetsMock() {
  const presets = Object.values(PRESETS).slice(0, 4);
  const active = useCycle(presets.length, 1800);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {presets.map((preset, i) => (
        <div
          key={preset.presetId}
          className={cn(
            "overflow-hidden rounded-lg border bg-background transition-all duration-300",
            i === active
              ? "border-primary ring-2 ring-primary"
              : "border-border",
          )}
        >
          <div
            className="flex gap-1 p-2.5"
            style={{ backgroundColor: preset.background }}
          >
            {(["accent", "heading", "text", "link"] as const).map((key) => (
              <span
                key={key}
                className="size-4 rounded border border-black/10"
                style={{ backgroundColor: preset[key] }}
              />
            ))}
          </div>
          <div className="border-t px-2.5 py-1.5 text-xs font-medium">
            {PRESET_LABELS[preset.presetId]}
          </div>
        </div>
      ))}
    </div>
  );
}

const FONTS = ["Merriweather", "Inter", "Lora", "Poppins"] as const;

/** Mock of the `TypographyPanel` — animated font dropdown + two sliders. */
export function TypographyMock() {
  const selected = useCycle(FONTS.length, 2000);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    setOpen(true);
    const id = setTimeout(() => setOpen(false), 1100);
    return () => clearTimeout(id);
  }, [selected]);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground">Font Judul</span>
        <div className="relative">
          <div
            className={cn(
              "flex h-8 items-center justify-between rounded-md border bg-background px-2.5 text-xs text-foreground shadow-sm transition-colors",
              open && "border-primary",
            )}
            style={{ fontFamily: FONTS[selected] }}
          >
            {FONTS[selected]}
            <span
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            >
              ▾
            </span>
          </div>
          {open && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 origin-top overflow-hidden rounded-md border bg-popover p-1 shadow-lg [animation:mock-dropdown_0.18s_ease-out]">
              {FONTS.map((font, i) => (
                <div
                  key={font}
                  className={cn(
                    "flex items-center justify-between rounded px-2 py-1 text-xs",
                    i === selected
                      ? "bg-primary/10 text-primary"
                      : "text-foreground",
                  )}
                  style={{ fontFamily: font }}
                >
                  {font}
                  {i === selected && <CheckIcon className="size-3" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <MockSlider
        label="Ukuran"
        from={0.4}
        to={0.7}
        format={(f) => `${Math.round((0.85 + f * 0.3) * 100)}%`}
      />
      <MockSlider
        label="Spasi Baris"
        from={0.3}
        to={0.6}
        format={(f) => (1.2 + f * 0.6).toFixed(2)}
      />
    </div>
  );
}

function MockSlider({
  label,
  from,
  to,
  format,
}: {
  label: string;
  from: number;
  to: number;
  format: (fill: number) => string;
}) {
  const [fill, setFill] = useState(from);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    let up = true;
    const id = setInterval(() => {
      setFill((v) => {
        if (up && v >= to) up = false;
        else if (!up && v <= from) up = true;
        return Math.min(to, Math.max(from, v + (up ? 0.04 : -0.04)));
      });
    }, 180);
    return () => clearInterval(id);
  }, [from, to]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {format(fill)}
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-200 ease-linear"
          style={{ width: `${fill * 100}%` }}
        />
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background shadow transition-[left] duration-200 ease-linear"
          style={{ left: `${fill * 100}%` }}
        />
      </div>
    </div>
  );
}

type DownloadPhase = "idle" | "click" | "downloading" | "done";

const EXPORT_FORMATS = [
  {
    icon: FileDownIcon,
    label: "Unduh PDF",
    file: "cv-saya.pdf",
    iconClass: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
  {
    icon: FileImageIcon,
    label: "Unduh PNG",
    file: "cv-saya.png",
    iconClass:
      "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
] as const;

/**
 * Mock of the `ExportPanel` — both cards show at rest. A fake cursor glides to
 * the active card and clicks; the other card collapses while it runs
 * downloading → done, then both return and the active format swaps.
 */
export function ExportMock() {
  const [which, setWhich] = useState(0);
  const [phase, setPhase] = useState<DownloadPhase>("idle");
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setPhase("idle");
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    function run() {
      setPhase("idle");
      timers.push(setTimeout(() => setPhase("click"), 1100));
      timers.push(setTimeout(() => setPhase("downloading"), 1400));
      timers.push(setTimeout(() => setPhase("done"), 2800));
      timers.push(setTimeout(() => setPhase("idle"), 4000));
      timers.push(
        setTimeout(
          () => setWhich((w) => (w + 1) % EXPORT_FORMATS.length),
          4300,
        ),
      );
    }
    run();
    const id = setInterval(run, 4800);
    return () => {
      clearInterval(id);
      for (const t of timers) clearTimeout(t);
    };
  }, []);
  const isIdle = phase === "idle" || phase === "click";
  return (
    <div className="relative h-[6.25rem]">
      {EXPORT_FORMATS.map((fmt, i) => {
        const active = i === which;
        const Icon = fmt.icon;
        const collapsed = !active && !isIdle;
        const centered = active && !isIdle;
        return (
          <div
            key={fmt.file}
            className={cn(
              "absolute inset-x-0 transition-all duration-500 ease-out",
              collapsed && "opacity-0 pointer-events-none",
              centered
                ? "top-1/2 -translate-y-1/2"
                : i === 0
                  ? "top-0"
                  : "bottom-0",
            )}
          >
            <div
              className={cn(
                "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border bg-background p-3 shadow-sm transition-transform duration-200",
                active && phase === "click" && "scale-[0.98]",
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active && phase === "done"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : fmt.iconClass,
                )}
              >
                {active && phase === "downloading" ? (
                  <LoaderIcon className="size-5 animate-spin" />
                ) : active && phase === "done" ? (
                  <CheckIcon
                    key="done"
                    className="size-5 [animation:mock-pop_0.3s_ease-out]"
                  />
                ) : (
                  <Icon className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {active && phase === "downloading"
                    ? "Mengunduh…"
                    : active && phase === "done"
                      ? "Berhasil diunduh"
                      : fmt.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {fmt.file}
                </p>
              </div>
              {active && phase === "downloading" && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-primary/20">
                  <span className="block h-full bg-primary [animation:mock-progress_1.4s_ease-out_forwards]" />
                </span>
              )}
            </div>
          </div>
        );
      })}

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-6 z-10 transition-all duration-700 ease-out",
          isIdle ? "opacity-100" : "opacity-0",
          which === 0 ? "top-9" : "top-[4.25rem]",
        )}
      >
        {phase === "click" && (
          <span className="absolute -left-1 -top-1 size-6 rounded-full bg-primary/30 [animation:mock-ripple_0.4s_ease-out]" />
        )}
        <MousePointer2Icon className="size-4 fill-foreground text-background drop-shadow" />
      </span>
    </div>
  );
}

const ATS_CHECKS = [
  "Struktur terbaca mesin",
  "Tanpa kolom rumit",
  "Font standar",
] as const;

/** Mock of the ATS-friendly badge with a staggered check-in animation. */
export function AtsBadgeMock() {
  const step = useCycle(ATS_CHECKS.length + 1, 700);
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <ShieldCheckIcon className="size-3.5" />
        Lolos pemindaian ATS
      </span>
      <div className="w-full space-y-1.5">
        {ATS_CHECKS.map((item, i) => (
          <div
            key={item}
            className={cn(
              "flex items-center gap-2 text-xs transition-all duration-500",
              i < step
                ? "text-muted-foreground opacity-100"
                : "translate-x-1 opacity-40",
            )}
          >
            <CheckIcon
              className={cn(
                "size-3.5 transition-colors",
                i < step ? "text-emerald-500" : "text-muted-foreground/40",
              )}
            />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
