"use client";

import {
  ArrowRightIcon,
  BarChart3Icon,
  KanbanSquareIcon,
  MailIcon,
  SheetIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { COLUMN_COLORS } from "@/features/job-tracker/lib/column-colors";
import type { ColumnColor } from "@/features/job-tracker/schemas/job-tracker";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Marketing showcase for the Job Tracker feature. Fully self-contained and
 * hardcoded — it does NOT touch the job-tracker store or tRPC, so it renders
 * safely on the public landing page. Distinct from `BoardPreview`, which is
 * intentionally blurred + locked for the in-app free-plan upsell.
 */

/** Advances an index on an interval; pauses under reduced-motion. */
function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms]);
  return i;
}

type MockCard = {
  position: string;
  company: string;
  tags: { label: string; tone?: "muted" | "warn" }[];
};

type MockColumn = {
  name: string;
  color: ColumnColor;
  cards: MockCard[];
};

/** Hand-authored board that looks like a real, in-use pipeline. */
const COLUMNS: MockColumn[] = [
  {
    name: "Dilamar",
    color: "blue",
    cards: [
      {
        position: "Frontend Engineer",
        company: "Tokopedia",
        tags: [{ label: "Jakarta" }, { label: "Hybrid" }],
      },
      {
        position: "Product Designer",
        company: "Gojek",
        tags: [{ label: "Remote" }],
      },
      {
        position: "Data Analyst",
        company: "Bukalapak",
        tags: [{ label: "Perlu follow-up", tone: "warn" }],
      },
    ],
  },
  {
    name: "Interview",
    color: "yellow",
    cards: [
      {
        position: "Backend Engineer",
        company: "Traveloka",
        tags: [{ label: "Bandung" }, { label: "Onsite" }],
      },
      {
        position: "UX Researcher",
        company: "Blibli",
        tags: [{ label: "Remote" }],
      },
    ],
  },
  {
    name: "Offer",
    color: "purple",
    cards: [
      {
        position: "Senior Fullstack",
        company: "Ruangguru",
        tags: [{ label: "Hybrid" }],
      },
    ],
  },
  {
    name: "Diterima",
    color: "green",
    cards: [
      {
        position: "Mobile Engineer",
        company: "Dana",
        tags: [{ label: "Jakarta" }],
      },
    ],
  },
];

/** Flat list of every card with its column index, for the spotlight cycle. */
const FLAT_CARDS = COLUMNS.flatMap((col, colIndex) =>
  col.cards.map((card, cardIndex) => ({ card, colIndex, cardIndex })),
);

function MockCardBody({ card, active }: { card: MockCard; active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-3 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md",
        active
          ? "border-primary ring-2 ring-primary/60 [animation:mock-pulse_1.4s_ease-out]"
          : "border-border",
      )}
    >
      <p className="text-sm font-semibold leading-tight text-foreground">
        {card.position}
      </p>
      <p className="text-xs text-muted-foreground">{card.company}</p>
      {card.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <span
              key={tag.label}
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
                tag.tone === "warn"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Colorful, lightly-animated Kanban mock. A spotlight travels card-to-card. */
function BoardMock() {
  const spot = useCycle(FLAT_CARDS.length, 1900);
  const activeCard = FLAT_CARDS[spot];

  return (
    <div className="overflow-hidden rounded-2xl border bg-gradient-to-b from-muted/40 to-background p-4 shadow-sm sm:p-6">
      {/* Fake board toolbar. */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KanbanSquareIcon className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Lamaran Saya
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          Tersinkron
        </span>
      </div>

      <div className="flex items-start gap-3 overflow-x-auto pb-1 sm:gap-4">
        {COLUMNS.map((column, colIndex) => (
          <div key={column.name} className="w-52 shrink-0 space-y-3 sm:w-56">
            <div className="flex items-center justify-between gap-1 px-1">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    COLUMN_COLORS[column.color].dot,
                  )}
                />
                <span className="truncate">{column.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {column.cards.length}
              </span>
            </div>
            <div className="space-y-2">
              {column.cards.map((card, cardIndex) => (
                <MockCardBody
                  key={card.position}
                  card={card}
                  active={
                    activeCard.colIndex === colIndex &&
                    activeCard.cardIndex === cardIndex
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Highlight = {
  icon: typeof KanbanSquareIcon;
  title: string;
  description: string;
};

const HIGHLIGHTS: Highlight[] = [
  {
    icon: KanbanSquareIcon,
    title: "Pipeline Kanban",
    description:
      "Seret lamaran dari Dilamar ke Interview, Offer, hingga Diterima. Semua status dalam satu papan.",
  },
  {
    icon: MailIcon,
    title: "Email follow-up AI",
    description:
      "Hasilkan email tindak lanjut yang sopan dan profesional untuk setiap lamaran dalam sekali klik.",
  },
  {
    icon: BarChart3Icon,
    title: "Statistik & insight",
    description:
      "Pantau total lamaran, funnel konversi, dan mana yang perlu di-follow-up hari ini.",
  },
  {
    icon: SheetIcon,
    title: "Ekspor CSV",
    description:
      "Unduh seluruh data lamaran ke CSV untuk diolah di spreadsheet kapan saja.",
  },
];

/** Mini funnel numbers echoing the in-app stats card. */
const FUNNEL = [
  { label: "Dilamar", count: 24 },
  { label: "Interview", count: 9 },
  { label: "Offer", count: 3 },
  { label: "Diterima", count: 1 },
] as const;

export function JobTrackerShowcase() {
  return (
    <section
      id="job-tracker"
      className="relative mx-auto w-full max-w-6xl px-6 py-28"
    >
      <div
        aria-hidden
        className="glow-drift pointer-events-none absolute inset-x-0 top-24 -z-10 mx-auto h-64 max-w-3xl bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)] blur-2xl"
      />

      <Reveal>
        <SectionHeading
          eyebrow="Job Tracker"
          title="Lacak setiap lamaran, dari kirim sampai diterima"
          description="Bukan cuma bikin CV. Kelola seluruh proses melamar kerja di satu papan Kanban yang rapi, lengkap dengan bantuan AI dan statistik."
        />
      </Reveal>

      <Reveal className="mt-16" delay={80}>
        <BoardMock />
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((item, i) => (
          <Reveal key={item.title} delay={(i % 4) * 80} className="group">
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_40px_-12px_color-mix(in_oklch,var(--primary)_35%,transparent)]">
              <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-primary shadow-sm ring-1 ring-primary/10">
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>

              {item.title === "Statistik & insight" && (
                <div className="mt-4 space-y-1.5">
                  {FUNNEL.map((stage, stageIndex) => {
                    const pct = Math.round(
                      (stage.count / FUNNEL[0].count) * 100,
                    );
                    return (
                      <div key={stage.label} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[0.7rem]">
                          <span className="text-muted-foreground">
                            {stage.label}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">
                            {stage.count}
                            {stageIndex > 0 && (
                              <span className="ml-1 text-muted-foreground">
                                ({pct}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          href="/signup"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 gap-1.5 px-6 text-sm",
          )}
        >
          Coba Job Tracker gratis
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </section>
  );
}
