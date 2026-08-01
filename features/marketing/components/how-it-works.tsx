"use client";

import type { LucideIcon } from "lucide-react";
import {
  CheckIcon,
  DownloadIcon,
  PencilIcon,
  SwatchBookIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollStep } from "../hooks/use-scroll-step";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { StepPreviewMock } from "./step-previews";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
  preview: ReactNode;
};

const STEPS: Step[] = [
  {
    icon: SwatchBookIcon,
    title: "Pilih template",
    description:
      "Pilih dari lima desain profesional, lalu sesuaikan warna dan tipografi sesuai selera.",
    preview: <StepPreviewMock variant="template" />,
  },
  {
    icon: PencilIcon,
    title: "Isi data Anda",
    description:
      "Masukkan pengalaman, pendidikan, dan keahlian. Biarkan AI membantu memoles setiap kalimat.",
    preview: <StepPreviewMock variant="data" />,
  },
  {
    icon: DownloadIcon,
    title: "Unduh & kirim",
    description:
      "Ekspor CV Anda sebagai PDF berkualitas cetak yang ramah ATS, siap dilamar hari ini.",
    preview: <StepPreviewMock variant="export" />,
  },
];

const PANEL_CLASS =
  "absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none";

function StepCard({
  step,
  number,
  active,
  done,
  showRail,
  onClick,
}: {
  step: Step;
  number: number;
  active: boolean;
  done?: boolean;
  showRail?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      className={cn(
        "group relative flex w-full items-start gap-4 px-1 py-5 text-left transition-opacity duration-300",
        active ? "opacity-100" : "opacity-55 hover:opacity-100",
      )}
    >
      <span className="relative flex flex-col items-center">
        <span
          className={cn(
            "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors duration-300",
            active || done
              ? "border-primary/40 bg-primary text-primary-foreground ring-4 ring-primary/15"
              : "bg-background text-primary ring-1 ring-primary/10",
          )}
        >
          {done ? (
            <CheckIcon className="size-5" />
          ) : (
            <step.icon className="size-5" />
          )}
          <span
            className={cn(
              "absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-[0.6rem] font-semibold shadow transition-colors",
              active || done
                ? "bg-background text-primary"
                : "bg-primary text-primary-foreground",
            )}
          >
            {number}
          </span>
        </span>
        {showRail ? (
          <span
            aria-hidden
            className="absolute top-11 h-[calc(100%+0.75rem)] w-0.5 overflow-hidden rounded-full bg-border"
          >
            <span
              className={cn(
                "block h-full w-full origin-top bg-primary transition-transform duration-500 ease-out",
                done ? "scale-y-100" : "scale-y-0",
              )}
            />
          </span>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold tracking-tight text-foreground">
          {step.title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {step.description}
        </span>
      </span>
    </button>
  );
}

export function HowItWorks() {
  const { ref, index, scrollToStep } = useScrollStep(STEPS.length);

  const heading = (
    <SectionHeading
      eyebrow="Cara Kerja"
      title="Tiga langkah menuju CV impian"
      description="Tanpa ribet. Dari halaman kosong ke CV siap kirim dalam sekejap."
    />
  );

  return (
    <section
      ref={ref}
      id="cara-kerja"
      className="relative border-y bg-muted/30 lg:h-[300vh]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
      />

      {/* lg+ scroll-jack: sticky stage + advancing steps */}
      <div className="hidden h-full lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Reveal className="pt-20 pb-10">{heading}</Reveal>
          <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-[0.82fr_1.18fr] items-center gap-16 pb-20">
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <StepCard
                    step={step}
                    number={i + 1}
                    active={i === index}
                    done={i < index}
                    showRail={i < STEPS.length - 1}
                    onClick={() => scrollToStep(i)}
                  />
                </li>
              ))}
            </ol>

            <div
              aria-hidden
              className="relative h-[min(560px,58vh)] min-h-[460px] overflow-hidden rounded-[2rem] border bg-card shadow-[0_28px_90px_-36px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
            >
              <div className="flex items-center gap-1.5 border-b bg-background/80 px-5 py-3.5 backdrop-blur">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs font-medium text-muted-foreground">
                  {STEPS[index].title}
                </span>
                <div className="ml-auto flex gap-1.5">
                  {STEPS.map((step, i) => (
                    <span
                      key={step.title}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        i === index
                          ? "w-6 bg-primary"
                          : "w-1.5 bg-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="relative h-[calc(100%-2.75rem)]">
                {STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className={cn(
                      PANEL_CLASS,
                      i === index
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-3 opacity-0",
                    )}
                  >
                    <div className="flex h-full items-center justify-center px-5 py-6">
                      {step.preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* < lg fallback: stacked steps with previews */}
      <div className="py-20 lg:hidden">
        <div className="mx-auto max-w-xl">
          {heading}
          <div className="mt-10 space-y-8">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <StepCard
                  step={step}
                  number={i + 1}
                  active={i === index}
                  done={i < index}
                  onClick={() => scrollToStep(i)}
                />
                <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="flex h-[320px] items-center justify-center px-3">
                    {step.preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
