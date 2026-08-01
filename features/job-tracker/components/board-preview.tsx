import { LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { COLUMN_COLORS } from "@/features/job-tracker/lib/column-colors";
import type { ColumnColor } from "@/features/job-tracker/schemas/job-tracker";
import { cn } from "@/lib/utils";

/** A single fake application card — visually mirrors `ApplicationCardContent`
 *  but has no drag/data behaviour. Decorative only. */
type PreviewCard = {
  position: string;
  company: string;
  badges?: {
    label: string;
    variant?: "outline" | "secondary" | "destructive";
  }[];
};

type PreviewColumn = {
  name: string;
  color: ColumnColor;
  cards: PreviewCard[];
};

/** Hand-authored board content that looks like a real, in-use pipeline. */
const PREVIEW_COLUMNS: PreviewColumn[] = [
  {
    name: "Dilamar",
    color: "blue",
    cards: [
      {
        position: "Frontend Engineer",
        company: "Tokopedia",
        badges: [
          { label: "Jakarta", variant: "outline" },
          { label: "Hybrid", variant: "secondary" },
        ],
      },
      {
        position: "Product Designer",
        company: "Gojek",
        badges: [{ label: "Remote", variant: "secondary" }],
      },
      {
        position: "Data Analyst",
        company: "Bukalapak",
        badges: [{ label: "Perlu follow-up", variant: "destructive" }],
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
        badges: [
          { label: "Bandung", variant: "outline" },
          { label: "Onsite", variant: "secondary" },
        ],
      },
      {
        position: "UX Researcher",
        company: "Blibli",
        badges: [{ label: "Remote", variant: "secondary" }],
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
        badges: [{ label: "Hybrid", variant: "secondary" }],
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
        badges: [{ label: "Jakarta", variant: "outline" }],
      },
    ],
  },
];

function PreviewCardBody({ card }: { card: PreviewCard }) {
  return (
    <Card className="gap-0 py-3">
      <CardContent className="space-y-2 px-3">
        <div>
          <p className="text-sm font-semibold leading-tight">{card.position}</p>
          <p className="text-xs text-muted-foreground">{card.company}</p>
        </div>
        {card.badges && card.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.badges.map((b) => (
              <Badge key={b.label} variant={b.variant ?? "outline"}>
                {b.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Static, non-interactive mock of the Kanban board shown behind the free-plan
 * upsell. Blurred + faded + locked. Uses the real column colors and card
 * markup so it reads as an authentic preview, but carries no data or behaviour.
 */
export function BoardPreview() {
  return (
    <div className="relative w-full">
      {/* The mock board itself — decorative, inert, hidden from a11y tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none scale-[0.98] select-none blur-[2px]"
      >
        <div className="flex items-start gap-4 overflow-hidden pb-2">
          {PREVIEW_COLUMNS.map((column) => (
            <div key={column.name} className="w-64 shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-1 px-1">
                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
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
                {column.cards.map((card) => (
                  <PreviewCardBody key={card.position} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fade the board into the background toward the bottom. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Centered lock chip. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm">
          <LockIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span>Preview — upgrade untuk mengakses</span>
        </div>
      </div>
    </div>
  );
}
