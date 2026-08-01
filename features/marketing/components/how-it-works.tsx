"use client";

import type { LucideIcon } from "lucide-react";
import { DownloadIcon, PencilIcon, SwatchBookIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollStep } from "../hooks/use-scroll-step";
import {
  AiToolbarMock,
  AtsBadgeMock,
  ColorPresetsMock,
  ExportMock,
  TypographyMock,
} from "./feature-mocks";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
  preview: ReactNode;
};

const STEPS: Step[] = [
  {
    icon: PencilIcon,
    title: "Isi data Anda",
    description:
      "Masukkan pengalaman, pendidikan, dan keahlian. Biarkan AI membantu memoles setiap kalimat.",
    preview: <AiToolbarMock />,
  },
  {
    icon: SwatchBookIcon,
    title: "Pilih template",
    description:
      "Pilih dari lima desain profesional, lalu sesuaikan warna dan tipografi sesuai selera.",
    preview: (
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorPresetsMock />
        <TypographyMock />
      </div>
    ),
  },
  {
    icon: DownloadIcon,
    title: "Unduh & kirim",
    description:
      "Ekspor CV Anda sebagai PDF berkualitas cetak yang ramah ATS, siap dilamar hari ini.",
    preview: (
      <div className="grid gap-4 sm:grid-cols-2">
        <ExportMock />
        <AtsBadgeMock />
      </div>
    ),
  },
];

const PANEL_CLASS =
  "absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none";

function StepCard({
  step,
  number,
  active,
  onClick,
}: {
  step: Step;
  number: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      className={cn(
        "group flex w-full items-start gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all duration-300",
        active
          ? "border-primary/50 shadow-[0_8px_40px_-12px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
          : "border-transparent opacity-60 hover:opacity-100",
      )}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm ring-1 ring-primary/10">
        <step.icon className="size-5" />
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground shadow">
          {number}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-foreground">
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
      <div className="hidden lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Reveal className="pt-20 pb-10">{heading}</Reveal>
          <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-12 pb-20">
            <ol className="space-y-5">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <StepCard
                    step={step}
                    number={i + 1}
                    active={i === index}
                    onClick={() => scrollToStep(i)}
                  />
                </li>
              ))}
            </ol>

            <div
              aria-hidden
              className="relative h-[420px] overflow-hidden rounded-2xl border bg-card p-6 shadow-sm"
            >
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
                  <div className="flex h-full items-center">{step.preview}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* < lg fallback: stacked steps with previews */}
      <div className="py-20 lg:hidden">
        <div className="mx-auto max-w-xl">
          {heading}
          <div className="mt-10 space-y-10">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <StepCard
                  step={step}
                  number={i + 1}
                  active={i === index}
                  onClick={() => scrollToStep(i)}
                />
                <div className="mt-4 rounded-2xl border bg-card p-6 shadow-sm">
                  {step.preview}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
