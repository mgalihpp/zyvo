import type { LucideIcon } from "lucide-react";
import { DownloadIcon, PencilIcon, SwatchBookIcon } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    icon: PencilIcon,
    title: "Isi data Anda",
    description:
      "Masukkan pengalaman, pendidikan, dan keahlian. Biarkan AI membantu memoles setiap kalimat.",
  },
  {
    icon: SwatchBookIcon,
    title: "Pilih template",
    description:
      "Pilih dari lima desain profesional, lalu sesuaikan warna dan tipografi sesuai selera.",
  },
  {
    icon: DownloadIcon,
    title: "Unduh & kirim",
    description:
      "Ekspor CV Anda sebagai PDF berkualitas cetak yang ramah ATS, siap dilamar hari ini.",
  },
];

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="relative border-y bg-muted/30 py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
      />
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Cara Kerja"
            title="Tiga langkah menuju CV impian"
            description="Tanpa ribet. Dari halaman kosong ke CV siap kirim dalam sekejap."
          />
        </Reveal>

        <div className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block"
          />
          {STEPS.map((step, i) => (
            <Reveal
              key={step.title}
              delay={i * 120}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative flex size-14 items-center justify-center rounded-2xl border bg-background text-primary shadow-sm ring-1 ring-primary/10">
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-2xl bg-primary/10 blur-md"
                />
                <step.icon className="size-6" />
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
