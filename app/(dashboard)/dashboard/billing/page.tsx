"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  LockIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "gratis selamanya",
    monthly: 0,
    yearly: 0,
    cta: "Mulai gratis",
    ctaVariant: "outline" as const,
    ctaNote: "buat CV pertamamu",
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "untuk pencari kerja aktif",
    monthly: 15000,
    yearly: 150000,
    cta: "Upgrade",
    ctaVariant: "default" as const,
    ctaNote: "Batalkan kapan saja",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "untuk pencari kerja serius",
    monthly: 75000,
    yearly: 750000,
    cta: "Upgrade",
    ctaVariant: "default" as const,
    ctaNote: "Garansi uang kembali 7 hari",
    popular: true,
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

type FeatureValue = string | boolean | null;

const FEATURES: {
  label: string;
  values: Record<PlanId, FeatureValue>;
}[] = [
  {
    label: "Unduh PDF",
    values: {
      free: "Tak terbatas",
      basic: "Tak terbatas",
      pro: "Tak terbatas",
    },
  },
  { label: "CV", values: { free: "1", basic: "3", pro: "Tak terbatas" } },
  {
    label: "Template Premium",
    values: { free: null, basic: true, pro: true },
  },
  { label: "Pelacak Lamaran", values: { free: null, basic: true, pro: true } },
  { label: "Fitur AI", values: { free: null, basic: null, pro: true } },
];

const FAQS = [
  {
    q: "Apakah Zyvo benar-benar gratis?",
    a: "Ya. Paket Gratis kami tidak memerlukan kartu kredit dan gratis selamanya.",
  },
  {
    q: "Apa saja yang termasuk dalam paket Gratis?",
    a: "1 CV dan unduhan PDF tak terbatas.",
  },
  {
    q: "Apa fitur tambahan di paket Basic?",
    a: "Hingga 3 CV, Template Premium, dan akses ke Pelacak Lamaran.",
  },
  {
    q: "Apa fitur tambahan di paket Pro?",
    a: "CV tak terbatas, Template Premium, Pelacak Lamaran, dan seluruh Fitur AI.",
  },
  {
    q: "Bisakah saya membatalkan langganan kapan saja?",
    a: "Tentu. Batalkan dari pengaturan akun kapan saja — tanpa pertanyaan.",
  },
  {
    q: "Apa yang terjadi jika paket berbayar saya berakhir atau saya turunkan?",
    a: "Kamu tetap punya akses hingga akhir periode tagihan, lalu kembali ke paket Gratis.",
  },
  {
    q: "Apakah ada garansi uang kembali?",
    a: "Kami menawarkan garansi uang kembali 7 hari untuk semua paket berbayar.",
  },
  {
    q: "Metode pembayaran apa yang didukung?",
    a: "Kami menerima semua kartu kredit utama melalui Stripe.",
  },
];

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatPrice(amount: number) {
  if (amount === 0) return "Rp0";
  return IDR.format(amount);
}

function FeatureIcon({
  value,
  isPro,
}: {
  value: FeatureValue;
  isPro: boolean;
}) {
  if (value === null)
    return (
      <LockIcon
        className={cn(
          "mx-auto size-4",
          isPro ? "text-primary-foreground/60" : "text-muted-foreground/70",
        )}
      />
    );
  if (value === true)
    return (
      <CheckIcon
        className={cn(
          "mx-auto size-4",
          isPro ? "text-primary-foreground" : "text-foreground",
        )}
      />
    );
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        isPro ? "text-primary-foreground" : "",
      )}
    >
      {value}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-sm font-medium">{q}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <p className="mt-3 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

/** Mobile: kartu per plan dengan accordion fitur */
function MobilePlanCard({
  plan,
  yearly,
}: {
  plan: (typeof PLANS)[number];
  yearly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isPro = plan.id === "pro";
  const price = yearly ? plan.yearly : plan.monthly;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        isPro
          ? "billing-shine border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "bg-card",
      )}
    >
      {plan.popular && (
        <Badge
          className={cn(
            "absolute right-4 top-4 gap-1",
            isPro
              ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
              : "",
          )}
        >
          <SparklesIcon className="size-2.5" />
          POPULER
        </Badge>
      )}

      <p className="text-lg font-bold">{plan.name}</p>
      <p
        className={cn(
          "text-xs",
          isPro ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {plan.tagline}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatPrice(price)}</span>
            {price > 0 && (
              <span
                className={cn(
                  "text-sm",
                  isPro
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground",
                )}
              >
                /{yearly ? "tahun" : "bulan"}
              </span>
            )}
          </div>
          {price === 0 && (
            <p
              className={cn(
                "text-xs",
                isPro ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              100% gratis selamanya
            </p>
          )}
          {price > 0 && yearly && (
            <p
              className={cn(
                "text-xs",
                isPro ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {formatPrice(Math.round(plan.yearly / 12))}/bulan ditagih tahunan
            </p>
          )}
        </div>
        <Button
          variant={plan.ctaVariant}
          className={cn(
            "shrink-0 font-semibold",
            isPro
              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : plan.ctaVariant === "default"
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "",
          )}
        >
          {plan.cta}
        </Button>
      </div>

      {/* Accordion fitur */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mt-4 flex w-full items-center justify-between border-t pt-4 text-sm font-semibold",
          isPro ? "border-primary-foreground/20" : "border-border",
        )}
      >
        Paket ini mencakup
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180",
            isPro ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {FEATURES.map((f) => {
            const val = f.values[plan.id];
            return (
              <li
                key={f.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span
                  className={
                    isPro
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }
                >
                  {f.label}
                </span>
                <span className="font-medium">
                  {val === null ? (
                    <LockIcon
                      className={cn(
                        "size-4",
                        isPro
                          ? "text-primary-foreground/40"
                          : "text-muted-foreground/40",
                      )}
                    />
                  ) : val === true ? (
                    <CheckIcon
                      className={cn(
                        "size-4",
                        isPro ? "text-primary-foreground" : "text-foreground",
                      )}
                    />
                  ) : (
                    val
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PlanPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Paket &amp; Harga</h1>
        {/* Toggle */}
        <div className="flex items-center gap-1 rounded-full border bg-muted p-1 text-sm">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              !yearly
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Bulanan
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors",
              yearly
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Tahunan{" "}
            <span
              className={cn(
                "text-xs",
                yearly ? "text-background/70" : "text-primary",
              )}
            >
              Hemat 2 bulan
            </span>
          </button>
        </div>
      </div>

      {/* Cards — semua ukuran kecuali layar sangat lebar */}
      <div className="flex flex-col gap-4 xl:hidden">
        {PLANS.map((plan) => (
          <MobilePlanCard key={plan.id} plan={plan} yearly={yearly} />
        ))}
      </div>

      {/* Desktop table — hanya di layar ≥1536px */}
      <div className="relative hidden overflow-hidden rounded-2xl border bg-card shadow-sm xl:block">
        {/* shine overlay — kolom Pro (kanan 1/4) */}
        <div
          aria-hidden
          className="billing-shine pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4"
        />

        {/* Plan headers */}
        <div className="grid grid-cols-4">
          <div className="p-6" />
          {PLANS.map((plan) => {
            const price = yearly ? plan.yearly : plan.monthly;
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative p-6",
                  isPro ? "bg-primary text-primary-foreground" : "",
                )}
              >
                {plan.popular && (
                  <Badge
                    className={cn(
                      "mb-2 gap-1",
                      isPro
                        ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                        : "",
                    )}
                  >
                    <SparklesIcon className="size-2.5" />
                    POPULER
                  </Badge>
                )}
                <p className="text-lg font-bold">{plan.name}</p>
                <p
                  className={cn(
                    "text-xs",
                    isPro
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {plan.tagline}
                </p>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span
                        className={cn(
                          "text-sm",
                          isPro
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        /{yearly ? "tahun" : "bulan"}
                      </span>
                    )}
                  </div>
                  {price === 0 && (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isPro
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      100% gratis selamanya
                    </p>
                  )}
                  {price > 0 && yearly && (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isPro
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatPrice(Math.round(plan.yearly / 12))}/bulan ditagih
                      tahunan
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Feature rows */}
        {FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="grid grid-cols-4 border-b last:border-0"
          >
            <div className="flex items-center p-4 text-sm text-foreground/80">
              {feature.label}
            </div>
            {PLANS.map((plan) => {
              const isPro = plan.id === "pro";
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex items-center justify-center border-l p-4 text-center",
                    isPro ? "bg-primary" : "",
                  )}
                >
                  <FeatureIcon value={feature.values[plan.id]} isPro={isPro} />
                </div>
              );
            })}
          </div>
        ))}

        {/* CTA row */}
        <div className="grid grid-cols-4 border-t">
          <div />
          {PLANS.map((plan) => {
            const isPro = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col items-center gap-1 border-l p-5",
                  isPro ? "bg-primary" : "",
                )}
              >
                <Button
                  variant={plan.ctaVariant}
                  className={cn(
                    "w-full text-sm font-semibold",
                    isPro
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      : plan.ctaVariant === "default"
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "",
                  )}
                >
                  {plan.cta}
                </Button>
                <p
                  className={cn(
                    "text-xs",
                    isPro
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {plan.ctaNote}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl space-y-6 pt-16">
        <h2 className="text-2xl font-bold">Pertanyaan yang Sering Diajukan</h2>
        <div className="divide-y">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </div>
  );
}
