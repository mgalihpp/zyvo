import type { ColumnColor } from "@/features/job-tracker/schemas/job-tracker";

export type MockCard = {
  position: string;
  company: string;
  tags: { label: string; tone?: "muted" | "warn" }[];
};

export type MockColumn = {
  name: string;
  color: ColumnColor;
  cards: MockCard[];
};

/** Hand-authored board that looks like a real, in-use pipeline. */
export const COLUMNS: MockColumn[] = [
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

/** Ordered rotation of "drags": each card hops to the next column forward.
 *  Ordered so no column ever exceeds the initial max (3 cards) — the showcase
 *  locks column height, so a 4th card would clip. */
export const DRAG_SEQUENCE = [
  "Data Analyst", // Bukalapak → Interview
  "UX Researcher", // Blibli → Offer
  "Frontend Engineer", // Tokopedia → Interview
  "Senior Fullstack", // Ruangguru → Diterima
  "Backend Engineer", // Traveloka → Offer
  "Product Designer", // Gojek → Interview
];

export function resetBoard(): MockColumn[] {
  return structuredClone(COLUMNS);
}

/** Move a card to the end of the next column. No-op if missing or at the last column. */
export function moveCardForward(
  board: MockColumn[],
  position: string,
): MockColumn[] {
  const src = board.findIndex((col) =>
    col.cards.some((card) => card.position === position),
  );
  if (src === -1 || src >= board.length - 1) return board;
  const card = board[src].cards.find((c) => c.position === position);
  if (!card) return board;
  return board.map((col, i) => {
    if (i === src) {
      return {
        ...col,
        cards: col.cards.filter((c) => c.position !== position),
      };
    }
    if (i === src + 1) return { ...col, cards: [...col.cards, card] };
    return col;
  });
}
