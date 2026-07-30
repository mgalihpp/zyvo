"use client";

import { TEMPLATE_REGISTRY } from "@/features/cv/components/templates";
import { cn } from "@/lib/utils";
import {
  AiToolbarMock,
  AtsBadgeMock,
  ColorPresetsMock,
  ExportMock,
  SaveIndicatorMock,
  TypographyMock,
} from "./feature-mocks";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { MarketingTemplateThumb } from "./template-thumb";

type Feature = {
  title: string;
  description: string;
  mock: React.ReactNode;
  /** Column span on the 6-col bento grid at `lg`. */
  span: string;
};

const FEATURES: Feature[] = [
  {
    title: "Ditulis ulang oleh AI",
    description:
      "Formalkan, persingkat, atau perbaiki kalimat pengalaman Anda dalam sekali klik — plus terjemahan ke Bahasa Inggris.",
    mock: <AiToolbarMock />,
    span: "lg:col-span-4",
  },
  {
    title: "Ramah ATS",
    description:
      "Struktur bersih yang lolos screening otomatis sistem pelacak lamaran.",
    mock: <AtsBadgeMock />,
    span: "lg:col-span-2",
  },
  {
    title: "Warna kustom",
    description: "Sesuaikan palet warna agar CV mencerminkan diri Anda.",
    mock: <ColorPresetsMock />,
    span: "lg:col-span-2",
  },
  {
    title: "Kontrol tipografi penuh",
    description:
      "Atur font judul, ukuran, dan spasi baris dengan slider langsung di editor.",
    mock: <TypographyMock />,
    span: "lg:col-span-2",
  },
  {
    title: "5 template siap pakai",
    description:
      "Dari Classic yang netral hingga Modern dua kolom — semua dirancang oleh desainer.",
    mock: <TemplateDeck />,
    span: "lg:col-span-2",
  },
  {
    title: "Simpan otomatis",
    description:
      "Setiap perubahan tersimpan otomatis. Tutup tab kapan saja, lanjutkan tanpa kehilangan progres.",
    mock: <SaveIndicatorMock />,
    span: "lg:col-span-2",
  },
  {
    title: "Ekspor PDF & PNG instan",
    description:
      "Unduh CV berkualitas cetak dalam format PDF yang rapi, atau PNG untuk dibagikan online.",
    mock: <ExportMock />,
    span: "lg:col-span-4",
  },
];

const DECK_TEMPLATES = [
  "minimal",
  "professional",
  "classic",
  "modern",
  "fresh-graduate",
] as const;

/** Fanned stack ("distack") of all 5 real template thumbnails. */
function TemplateDeck() {
  const count = DECK_TEMPLATES.length;
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="relative h-full w-32">
        {DECK_TEMPLATES.map((id, i) => {
          const template = TEMPLATE_REGISTRY[id];
          if (!template) return null;
          const offset = i - (count - 1) / 2;
          return (
            <div
              key={id}
              className="absolute left-1/2 top-1/2 w-32 overflow-hidden rounded-md border bg-background shadow-md transition-transform duration-300"
              style={{
                transform: `translate(-50%, -50%) translateX(${offset * 16}px) rotate(${offset * 5}deg)`,
                zIndex: count - Math.abs(offset),
              }}
            >
              <MarketingTemplateThumb template={template} scale={0.16} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section
      id="fitur"
      className="relative mx-auto w-full max-w-6xl px-6 py-28"
    >
      <div
        aria-hidden
        className="glow-drift pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-64 max-w-3xl bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)] blur-2xl"
      />

      <Reveal>
        <SectionHeading
          eyebrow="Fitur"
          title="Semua yang Anda butuhkan untuk CV yang menonjol"
          description="Zyvo menggabungkan bantuan AI, desain profesional, dan kemudahan pakai dalam satu alat."
        />
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {FEATURES.map((feature, i) => (
          <Reveal
            key={feature.title}
            delay={(i % 3) * 80}
            className={cn("group", feature.span)}
          >
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_40px_-12px_color-mix(in_oklch,var(--primary)_35%,transparent)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-primary/5 blur-2xl transition-all duration-300 group-hover:bg-primary/10"
              />
              <div className="relative">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <div className="relative mt-6 flex flex-1 items-end">
                <div className="w-full rounded-xl border bg-gradient-to-b from-muted/60 to-muted/20 p-4 shadow-inner">
                  {feature.mock}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
