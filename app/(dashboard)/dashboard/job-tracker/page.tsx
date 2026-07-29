"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

function JobTrackerIllustration() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 480 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary/20 dark:text-primary/15"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="cardGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="cardGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="cardGrad3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-4)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--chart-4)" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="cardGrad4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-5)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--chart-5)" stopOpacity="0.05" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="20"
            floodColor="var(--primary)"
            floodOpacity="0.15"
          />
        </filter>
      </defs>

      {/* Kanban board background */}
      <rect
        x="20"
        y="20"
        width="440"
        height="300"
        rx="16"
        fill="url(#boardGrad)"
        filter="url(#softShadow)"
      />

      {/* Column headers */}
      <g
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
        fillOpacity="0.45"
      >
        <text x="58" y="54" textAnchor="middle">
          DILAMAR
        </text>
        <text x="178" y="54" textAnchor="middle">
          INTERVIEW
        </text>
        <text x="302" y="54" textAnchor="middle">
          OFFER
        </text>
        <text x="422" y="54" textAnchor="middle">
          DITERIMA
        </text>
      </g>

      {/* Column separators */}
      <line
        x1="118"
        y1="36"
        x2="118"
        y2="304"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line
        x1="238"
        y1="36"
        x2="238"
        y2="304"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <line
        x1="358"
        y1="36"
        x2="358"
        y2="304"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* Cards in Applied column */}
      <rect
        x="38"
        y="68"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad1)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
      <rect
        x="38"
        y="148"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad1)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
      <rect
        x="38"
        y="228"
        width="144"
        height="52"
        rx="10"
        fill="url(#cardGrad1)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
        fillOpacity="0.6"
      />

      {/* Cards in Interview column */}
      <rect
        x="158"
        y="68"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad2)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
      <rect
        x="158"
        y="148"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad2)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />

      {/* Cards in Offer column */}
      <rect
        x="278"
        y="68"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad3)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />

      {/* Cards in Hired column */}
      <rect
        x="398"
        y="68"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad4)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />
      <rect
        x="398"
        y="148"
        width="144"
        height="68"
        rx="10"
        fill="url(#cardGrad4)"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1.5"
      />

      {/* Card content lines */}
      <g
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        {/* Applied cards content */}
        <line x1="52" y1="88" x2="158" y2="88" />
        <line x1="52" y1="108" x2="132" y2="108" strokeOpacity="0.18" />
        <line x1="52" y1="124" x2="120" y2="124" strokeOpacity="0.12" />
        <line x1="52" y1="168" x2="158" y2="168" />
        <line x1="52" y1="188" x2="132" y2="188" strokeOpacity="0.18" />
        <line x1="52" y1="204" x2="120" y2="204" strokeOpacity="0.12" />
        <line x1="52" y1="244" x2="130" y2="244" />
        <line x1="52" y1="260" x2="110" y2="260" strokeOpacity="0.18" />

        {/* Interview cards content */}
        <line x1="172" y1="88" x2="278" y2="88" />
        <line x1="172" y1="108" x2="260" y2="108" strokeOpacity="0.18" />
        <line x1="172" y1="168" x2="278" y2="168" />
        <line x1="172" y1="188" x2="260" y2="188" strokeOpacity="0.18" />

        {/* Offer card content */}
        <line x1="292" y1="88" x2="398" y2="88" />
        <line x1="292" y1="108" x2="380" y2="108" strokeOpacity="0.18" />
        <line x1="292" y1="124" x2="360" y2="124" strokeOpacity="0.12" />

        {/* Hired cards content */}
        <line x1="412" y1="88" x2="518" y2="88" />
        <line x1="412" y1="108" x2="500" y2="108" strokeOpacity="0.18" />
        <line x1="412" y1="124" x2="480" y2="124" strokeOpacity="0.12" />
        <line x1="412" y1="168" x2="518" y2="168" />
        <line x1="412" y1="188" x2="500" y2="188" strokeOpacity="0.18" />
      </g>

      {/* Floating decorative elements */}
      <g opacity="0.6">
        <circle
          cx="450"
          cy="260"
          r="8"
          fill="var(--primary)"
          fillOpacity="0.15"
        />
        <circle
          cx="465"
          cy="245"
          r="5"
          fill="var(--chart-2)"
          fillOpacity="0.15"
        />
        <circle
          cx="435"
          cy="248"
          r="4"
          fill="var(--chart-5)"
          fillOpacity="0.15"
        />
      </g>

      {/* Progress indicator dots */}
      <g fill="var(--primary)" fillOpacity="0.35">
        <circle cx="100" cy="290" r="3" />
        <circle cx="112" cy="290" r="3" fillOpacity="0.2" />
        <circle cx="124" cy="290" r="3" fillOpacity="0.1" />
      </g>
    </svg>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: lucide icons have inconsistent SVG prop signatures
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <Card
      className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="mb-3 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:text-primary-foreground transition-colors">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
    setEmail("");
    toast.add({
      title: "Berhasil!",
      description: "Kami akan mengirimkan update segera fitur ini rilis.",
    });
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircleIcon
            className="size-8 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
        </div>
        <h3 className="text-lg font-semibold">Kamu sudah terdaftar!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Periksa email {email} untuk konfirmasi.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
      <label htmlFor="waitlist-email" className="sr-only">
        Email untuk notifikasi
      </label>
      <Input
        id="waitlist-email"
        type="email"
        placeholder="Masukkan email kamu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="flex-1"
        aria-label="Email untuk notifikasi rilis"
      />
      <Button
        type="submit"
        disabled={loading || !email}
        className="whitespace-nowrap"
        aria-label="Daftar notifikasi"
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
              />
              <path
                className="opacity-75"
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            Mendaftar...
          </>
        ) : (
          <>
            <PlusIcon className="mr-2 size-4" aria-hidden="true" />
            Daftar Notifikasi
          </>
        )}
      </Button>
    </form>
  );
}

export default function JobTrackerPage() {
  const [showWaitlist, setShowWaitlist] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-12 sm:py-20 lg:py-24">
      {/* Hero Illustration */}
      <div className="relative w-full max-w-4xl aspect-[480/340]">
        <JobTrackerIllustration />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-gradient-to-tr from-primary/10 via-transparent to-chart-2/10 blur-3xl animate-pulse"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Coming Soon Badge */}
      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inset-0 animate-ping rounded-full bg-primary/75"
            aria-hidden="true"
          />
          <span
            className="relative rounded-full bg-primary"
            aria-hidden="true"
          />
        </span>
        <span>Segera Hadir</span>
      </div>

      {/* Title & Description */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Pelacak Lamaran <span className="text-primary">Pekerjaan</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Kelola semua lamaran pekerjaanmu di satu tempat. Kanban board visual,
          statistik konversi, reminder follow-up, dan sinkronisasi dengan CV
          Builder — semua terintegrasi.
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div className="w-full grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={TargetIcon}
          title="Pipeline Visual"
          description="Board Kanban drag-and-drop: Dilamar → Wawancara → Offer → Diterima. Lihat progres sekilas."
          delay={0}
        />
        <FeatureCard
          icon={ClockIcon}
          title="Reminder & Follow-up"
          description="Notifikasi otomatis untuk follow-up lamaran, jadwal wawancara, dan deadline penawaran."
          delay={100}
        />
        <FeatureCard
          icon={UsersIcon}
          title="Statistik Konversi"
          description="Dashboard analitik: total lamaran, rasio wawancara, waktu rata-rata, dan tingkat keberhasilan."
          delay={200}
        />
      </div>

      {/* Integration hints */}
      <div className="w-full max-w-2xl rounded-2xl border bg-muted/30 p-6 text-center">
        <div className="flex items-center justify-center gap-3 text-sm font-medium text-muted-foreground mb-4">
          <BellIcon className="size-5" aria-hidden="true" />
          <span>Integrasi mulus dengan Zyvo CV Builder</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircleIcon className="size-3" aria-hidden="true" />
            Impor CV langsung
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircleIcon className="size-3" aria-hidden="true" />
            Sinkronisasi profil
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircleIcon className="size-3" aria-hidden="true" />
            Template lamaran
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircleIcon className="size-3" aria-hidden="true" />
            Ekspor laporan
          </Badge>
        </div>
      </div>

      {/* Waitlist / CTA */}
      <div className="w-full max-w-xl text-center space-y-6">
        {showWaitlist ? (
          <WaitlistForm />
        ) : (
          <Button
            size="lg"
            className="gap-2 px-8 py-3.5 text-base"
            onClick={() => setShowWaitlist(true)}
          >
            <BellIcon className="size-4" aria-hidden="true" />
            Beri Tahu Saya Saat Rilis
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          Fitur ini akan tersedia untuk paket{" "}
          <strong className="text-foreground">Basic</strong> dan{" "}
          <strong className="text-primary">Pro</strong>. Gratis: 1 CV + unduhan
          PDF tak terbatas.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="/dashboard/billing"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-3 py-2 text-xs font-medium transition-colors hover:bg-input/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            Lihat paket & upgrade
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Coming soon timeline */}
      <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TargetIcon className="size-5 text-primary" aria-hidden="true" />
          Rencana Rilis
        </h3>
        <ol className="space-y-4">
          {[
            {
              phase: "Fase 1",
              title: "MVP Pipeline",
              desc: "Board Kanban, CRUD lamaran, status drag-drop",
              badge: "Q4 2024",
            },
            {
              phase: "Fase 2",
              title: "Notifikasi & Analitik",
              desc: "Email reminder, statistik konversi, ekspor CSV",
              badge: "Q1 2025",
            },
            {
              phase: "Fase 3",
              title: "Integrasi Penuh",
              desc: "Sinkron CV Builder, template surat lamaran, AI follow-up",
              badge: "Q2 2025",
            },
          ].map((item, i) => (
            <li
              key={i}
              className="relative pl-8 pb-4 last:pb-0 before:absolute before:left-0 before:top-1 before:h-full before:w-0.5 before:bg-border before:last:hidden"
            >
              <div className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {i + 1}
              </div>
              <div className="ms-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {item.phase}
                  </span>
                  <span className="font-medium">{item.title}</span>
                  <Badge
                    variant="outline"
                    className="ml-auto text-xs px-2 py-0.5"
                  >
                    {item.badge}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
