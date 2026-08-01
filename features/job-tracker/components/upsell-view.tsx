import {
  ArrowRightIcon,
  BrainCircuitIcon,
  ClockIcon,
  DownloadIcon,
  RefreshCwIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PLANS } from "@/features/billing/lib/plans";
import { BoardPreview } from "@/features/job-tracker/components/board-preview";
import { cn } from "@/lib/utils";

const priceLabel = new Intl.NumberFormat("id-ID").format(PLANS.basic.monthly);

/** Themed primary button, sized up for the hero + closing CTAs.
 *  Builds on `buttonVariants` so it keeps the app's primary color, focus ring,
 *  and press behaviour; `group/cta` only drives the icon micro-interactions. */
const primaryCtaClass = cn(
  buttonVariants({ size: "lg" }),
  "group/cta h-12 gap-2 rounded-xl px-8 text-base font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
);

type Feature = {
  // biome-ignore lint/suspicious/noExplicitAny: lucide icons have inconsistent SVG prop signatures
  icon: React.ComponentType<any>;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: TargetIcon,
    title: "Pipeline Visual",
    description:
      "Board Kanban drag-and-drop: Dilamar → Interview → Offer → Diterima. Kolom bisa diberi nama & warna sendiri.",
  },
  {
    icon: BrainCircuitIcon,
    title: "Asisten AI",
    description:
      "Buat surat lamaran, siapkan pertanyaan interview, dan analisis kecocokan CV dengan lowongan — otomatis.",
  },
  {
    icon: TrendingUpIcon,
    title: "Statistik & Funnel",
    description:
      "Lihat total lamaran dan konversi per tahap secara sekilas, biar tahu di mana harus fokus.",
  },
  {
    icon: ClockIcon,
    title: "Reminder Follow-up",
    description:
      "Tandai tanggal follow-up dan lihat lamaran mana yang perlu ditindaklanjuti hari ini.",
  },
  {
    icon: RefreshCwIcon,
    title: "Sinkronisasi CV",
    description:
      "Hubungkan tiap lamaran dengan CV dari CV Builder — AI pakai isi CV-mu langsung.",
  },
  {
    icon: DownloadIcon,
    title: "Export CSV",
    description:
      "Ekspor semua lamaran ke CSV untuk arsip atau analisis lebih lanjut kapan saja.",
  },
];

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_40px_-12px_color-mix(in_oklch,var(--primary)_35%,transparent)]">
      <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-primary shadow-sm ring-1 ring-primary/10">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/** Shown to free users hitting the paid-only job tracker. */
export function UpsellView() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-4 py-10 sm:py-16">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <SparklesIcon className="size-4" aria-hidden="true" />
          <span>Khusus paket Basic/Pro</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Lacak semua lamaranmu di{" "}
            <span className="text-primary">satu papan</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Kanban board visual, asisten AI, statistik konversi, reminder
            follow-up, dan sinkronisasi dengan CV Builder — semua terintegrasi.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/dashboard/billing" className={primaryCtaClass}>
            Upgrade Sekarang
            <ArrowRightIcon
              className="size-4 transition-transform group-hover/cta:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/dashboard/billing"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 rounded-xl px-8 text-base",
            )}
          >
            Lihat paket
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Mulai dari{" "}
          <span className="font-semibold text-foreground">Rp{priceLabel}</span>
          /bln
        </p>
      </div>

      {/* Locked board preview */}
      <div className="w-full">
        <BoardPreview />
      </div>

      {/* Feature showcase */}
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>

      {/* Closing CTA */}
      <Link href="/dashboard/billing" className={primaryCtaClass}>
        Upgrade Sekarang
        <ArrowRightIcon
          className="size-4 transition-transform group-hover/cta:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
