"use client";

import {
  ArrowRightIcon,
  ClockIcon,
  SparklesIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: lucide icons have inconsistent SVG prop signatures
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="mb-3 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
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

/** Shown to free users hitting the paid-only job tracker. */
export function UpsellView() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-12 sm:py-20">
      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
        <SparklesIcon className="size-4" aria-hidden="true" />
        <span>Khusus paket Basic/Pro</span>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Pelacak Lamaran khusus paket{" "}
          <span className="text-primary">Basic/Pro</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Kelola semua lamaran pekerjaanmu di satu tempat. Kanban board visual,
          statistik konversi, reminder follow-up, dan sinkronisasi dengan CV
          Builder — semua terintegrasi.
        </p>
      </div>

      <div className="w-full grid gap-4 sm:grid-cols-3">
        <FeatureCard
          icon={TargetIcon}
          title="Pipeline Visual"
          description="Board Kanban drag-and-drop: Dilamar → Interview → Offer → Diterima. Lihat progres sekilas."
        />
        <FeatureCard
          icon={ClockIcon}
          title="Reminder & Follow-up"
          description="Tandai tanggal follow-up dan dapatkan pengingat lamaran yang perlu ditindaklanjuti."
        />
        <FeatureCard
          icon={UsersIcon}
          title="Statistik Konversi"
          description="Dashboard analitik: total lamaran, funnel konversi per tahap, dan ekspor CSV."
        />
      </div>

      <Link
        href="/dashboard/billing"
        className={cn(
          buttonVariants({ size: "lg" }),
          "gap-2 px-8 py-3.5 text-base",
        )}
      >
        Upgrade Sekarang
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
