"use client";

import { CheckIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/lib/auth-client";
import { useMounted } from "@/features/auth/lib/use-mounted";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

type Plan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaAuth: string;
  href: string;
  hrefAuth: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Gratis",
    price: "Rp0",
    description: "Semua yang Anda butuhkan untuk membuat CV pertama Anda.",
    features: [
      "1 CV",
      "Unduh PDF tak terbatas",
      "Template dasar",
      "Simpan otomatis",
    ],
    cta: "Mulai Gratis",
    ctaAuth: "Ke Dashboard",
    href: "/signup",
    hrefAuth: "/dashboard",
  },
  {
    name: "Basic",
    price: "Rp15rb",
    period: "/bulan",
    description: "Untuk pencari kerja aktif yang butuh lebih.",
    features: [
      "Hingga 3 CV",
      "Template Premium",
      "Pelacak Lamaran",
      "Unduh PDF tak terbatas",
    ],
    cta: "Tingkatkan ke Basic",
    ctaAuth: "Tingkatkan ke Basic",
    href: "/signup",
    hrefAuth: "/dashboard/billing",
  },
  {
    name: "Pro",
    price: "Rp75rb",
    period: "/bulan",
    description: "Untuk pencari kerja serius — buka semua fitur.",
    features: [
      "CV tak terbatas",
      "Semua Fitur AI",
      "Template Premium",
      "Pelacak Lamaran",
      "Garansi uang kembali 7 hari",
    ],
    cta: "Tingkatkan ke Pro",
    ctaAuth: "Tingkatkan ke Pro",
    href: "/signup",
    hrefAuth: "/dashboard/billing",
    featured: true,
  },
];

export function Pricing() {
  const mounted = useMounted();
  const { data: session, isPending } = useSession();
  const authed = mounted && !isPending && !!session;

  return (
    <section id="harga" className="relative border-y bg-muted/30 py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_50%_at_50%_100%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]"
      />
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Harga"
            title="Mulai gratis, tingkatkan saat siap"
            description="Tanpa kartu kredit untuk memulai. Batalkan kapan saja."
          />
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.name}
              delay={i * 120}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-transform duration-300",
                plan.featured
                  ? "billing-shine border-primary bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-xl md:-translate-y-2 md:hover:-translate-y-3"
                  : "bg-card shadow-sm hover:shadow-md",
              )}
            >
              {plan.featured ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  <SparklesIcon className="size-3.5" />
                  Paling populer
                </span>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {plan.name}
                </span>
              )}

              {plan.featured ? (
                <span className="mt-3 text-sm font-semibold">{plan.name}</span>
              ) : null}

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                {plan.period ? (
                  <span
                    className={cn(
                      "text-sm",
                      plan.featured
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {plan.period}
                  </span>
                ) : null}
              </div>

              <p
                className={cn(
                  "mt-2 text-sm",
                  plan.featured
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {plan.description}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        plan.featured ? "bg-white/20" : "bg-primary/10",
                      )}
                    >
                      <CheckIcon
                        className={cn(
                          "size-3",
                          plan.featured ? "" : "text-primary",
                        )}
                      />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {!mounted || isPending ? (
                <Skeleton className="mt-8 h-11 w-full rounded-md" />
              ) : (
                <Link
                  href={authed ? plan.hrefAuth : plan.href}
                  className={cn(
                    buttonVariants({
                      variant: plan.featured
                        ? "default"
                        : plan.name === "Gratis"
                          ? "outline"
                          : "default",
                      size: "lg",
                    }),
                    "mt-8 h-11 text-sm",
                    plan.featured
                      ? "bg-white text-primary hover:bg-white/90"
                      : "",
                  )}
                >
                  {authed ? plan.ctaAuth : plan.cta}
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
