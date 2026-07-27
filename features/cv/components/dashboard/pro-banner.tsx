import { CheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  "Akses tak terbatas ke template premium",
  "Ekspor CV tanpa watermark",
  "Dukungan prioritas",
] as const;

/** Upgrade-to-Pro promo. Presentational only — no billing yet, so the CTA is inert. */
export function ProBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary via-primary to-primary/80 p-3 text-primary-foreground shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <SparklesIcon className="size-3.5" />
          Zyvo Pro
        </span>
        <p className="mt-1 text-xs text-primary-foreground/80">
          Buka semua fitur premium.
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 w-full bg-white text-primary hover:bg-white/90"
        >
          Upgrade ke Pro
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-sm sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/15 blur-2xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            <SparklesIcon className="size-3.5" />
            Zyvo Pro
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
            Tingkatkan ke Pro
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Buka semua fitur premium dan buat CV tanpa batas.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckIcon className="size-3" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <Button
          size="lg"
          variant="secondary"
          className="shrink-0 bg-white text-primary hover:bg-white/90"
        >
          <SparklesIcon />
          Upgrade ke Pro
        </Button>
      </div>
    </div>
  );
}
