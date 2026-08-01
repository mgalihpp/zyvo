# Landing Board Mock — Real Drop Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing-page Job Tracker board mock show a real kanban drop — cards actually move to the next column, persist for a hold, then the board resets and loops.

**Architecture:** Extract the board data + pure move logic into a new `features/marketing/lib/board-mock.ts` (types, `COLUMNS`, `DRAG_SEQUENCE`, `resetBoard`, `moveCardForward`), testable with `bun test`. Rewrite `BoardMock` in `job-tracker-showcase.tsx` to hold `board` state, fly a clone, and commit the move on landing. Reset + loop after the last card.

**Tech Stack:** React 19, TypeScript, bun (`node:test`), Tailwind v4.

## Global Constraints

- Self-contained mock: no store, no tRPC, no real dnd — safe on public landing page.
- Card identity = `position` string (all unique on the board).
- Drop appends to **end** of destination column list (user choice).
- Board resets to original layout after a full rotation, then loops forever (user choice).
- `prefers-reduced-motion: reduce` → static board, no animation (current behavior).
- Card flight cadence unchanged: ~2600ms/cycle, ~900ms flight.
- Touch only `features/marketing/`. Do not touch in-app kanban or `BoardPreview`.

---

### Task 1: Extract board data + pure move logic

**Files:**
- Create: `features/marketing/lib/board-mock.ts`
- Test: `features/marketing/lib/__tests__/board-mock.test.ts`

**Interfaces:**
- Produces:
  - `type MockCard = { position: string; company: string; tags: { label: string; tone?: "muted" | "warn" }[] }`
  - `type MockColumn = { name: string; color: ColumnColor; cards: MockCard[] }`
  - `const COLUMNS: MockColumn[]` — the hand-authored board (copied verbatim from the component)
  - `const DRAG_SEQUENCE: string[]` — card `position`s, one-column-forward moves:
    `["Data Analyst", "UX Researcher", "Frontend Engineer", "Senior Fullstack", "Product Designer", "Backend Engineer"]`
  - `resetBoard(): MockColumn[]` — deep copy of `COLUMNS`
  - `moveCardForward(board: MockColumn[], position: string): MockColumn[]` — remove card from its current column, append to end of the next column; return `board` unchanged if the card is missing or already in the last column.

- [ ] **Step 1: Write the failing test**

Create `features/marketing/lib/__tests__/board-mock.test.ts`:

```ts
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  COLUMNS,
  DRAG_SEQUENCE,
  moveCardForward,
  resetBoard,
} from "@/features/marketing/lib/board-mock";

test("moveCardForward removes from source and appends to end of next column", () => {
  const moved = moveCardForward(resetBoard(), "Data Analyst");
  assert.equal(
    moved[0].cards.some((c) => c.position === "Data Analyst"),
    false,
  );
  const dest = moved[1].cards;
  assert.equal(dest[dest.length - 1].position, "Data Analyst");
});

test("moveCardForward is a no-op for a card already in the last column", () => {
  const b = resetBoard();
  assert.equal(moveCardForward(b, "Mobile Engineer"), b);
});

test("moveCardForward is a no-op for an unknown position", () => {
  const b = resetBoard();
  assert.equal(moveCardForward(b, "Nope"), b);
});

test("every DRAG_SEQUENCE card moves exactly once across a cycle", () => {
  let board = resetBoard();
  const seen = new Set<string>();
  for (const pos of DRAG_SEQUENCE) {
    board = moveCardForward(board, pos);
    const total = board.reduce(
      (n, col) => n + col.cards.filter((c) => c.position === pos).length,
      0,
    );
    assert.equal(total, 1);
    assert.equal(seen.has(pos), false);
    seen.add(pos);
  }
});

test("resetBoard returns a fresh deep copy", () => {
  const a = resetBoard();
  const b = resetBoard();
  assert.notEqual(a, b);
  assert.notEqual(a[0].cards, b[0].cards);
  a[0].cards.push({ position: "X", company: "Y", tags: [] });
  assert.equal(COLUMNS[0].cards.length, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/marketing/lib/__tests__/board-mock.test.ts`
Expected: FAIL — `Cannot find module "@/features/marketing/lib/board-mock"`.

- [ ] **Step 3: Write the module**

Create `features/marketing/lib/board-mock.ts`:

```ts
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
      { position: "Frontend Engineer", company: "Tokopedia", tags: [{ label: "Jakarta" }, { label: "Hybrid" }] },
      { position: "Product Designer", company: "Gojek", tags: [{ label: "Remote" }] },
      { position: "Data Analyst", company: "Bukalapak", tags: [{ label: "Perlu follow-up", tone: "warn" }] },
    ],
  },
  {
    name: "Interview",
    color: "yellow",
    cards: [
      { position: "Backend Engineer", company: "Traveloka", tags: [{ label: "Bandung" }, { label: "Onsite" }] },
      { position: "UX Researcher", company: "Blibli", tags: [{ label: "Remote" }] },
    ],
  },
  {
    name: "Offer",
    color: "purple",
    cards: [
      { position: "Senior Fullstack", company: "Ruangguru", tags: [{ label: "Hybrid" }] },
    ],
  },
  {
    name: "Diterima",
    color: "green",
    cards: [
      { position: "Mobile Engineer", company: "Dana", tags: [{ label: "Jakarta" }] },
    ],
  },
];

/** Ordered rotation of "drags": each card hops to the next column forward. */
export const DRAG_SEQUENCE = [
  "Data Analyst", // Bukalapak → Interview
  "UX Researcher", // Blibli → Offer
  "Frontend Engineer", // Tokopedia → Interview
  "Senior Fullstack", // Ruangguru → Diterima
  "Product Designer", // Gojek → Interview
  "Backend Engineer", // Traveloka → Offer
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
  const card = board[src].cards.find((c) => c.position === position)!;
  return board.map((col, i) => {
    if (i === src) {
      return { ...col, cards: col.cards.filter((c) => c.position !== position) };
    }
    if (i === src + 1) return { ...col, cards: [...col.cards, card] };
    return col;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/marketing/lib/__tests__/board-mock.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add features/marketing/lib/board-mock.ts features/marketing/lib/__tests__/board-mock.test.ts
git commit -m "feat(showcase): extract board mock data + move logic"
```

---

### Task 2: Rewrite BoardMock to commit real drops

**Files:**
- Modify: `features/marketing/components/job-tracker-showcase.tsx`

**Interfaces:**
- Consumes: `MockCard`, `MockColumn`, `COLUMNS`, `DRAG_SEQUENCE`, `resetBoard`, `moveCardForward` from `../lib/board-mock`
- Produces: same exports as before (`JobTrackerShowcase`, `BoardMock`, `MockCardBody`); `BoardMock` now holds `board` state.

- [ ] **Step 1: Import from the new module**

Replace the local `MockCard` / `MockColumn` types, `COLUMNS`, and `DRAG_SEQUENCE` definitions with:

```ts
import {
  COLUMNS,
  DRAG_SEQUENCE,
  moveCardForward,
  resetBoard,
} from "../lib/board-mock";
import type { MockCard, MockColumn } from "../lib/board-mock";
```

Keep the existing `MockCardBody` component unchanged (still renders a `card: MockCard`).

Also remove the now-unused `import type { ColumnColor } from "@/features/job-tracker/schemas/job-tracker";` line (the `ColumnColor` type moves to the lib module; `COLUMN_COLORS` import stays).

- [ ] **Step 2: Add `board` state and rewrite the loop + flight**

In `BoardMock`, replace the `step`/`flight` state block and the two effects (`Advance the drag rotation` + `Measure + launch the current flight`) with:

```tsx
const [board, setBoard] = useState<MockColumn[]>(resetBoard);
const [step, setStep] = useState(0);
const [flight, setFlight] = useState<{
  position: string;
  card: MockCard;
  left: number;
  top: number;
  width: number;
  dx: number;
  dy: number;
} | null>(null);
const [moving, setMoving] = useState(false);
```

Keep the reduced-motion effect. Replace the two animation effects:

```tsx
// Advance the drag rotation; reset the board after the last card.
useEffect(() => {
  if (reduced) return;
  const id = setInterval(() => {
    const next = step + 1;
    if (next >= DRAG_SEQUENCE.length) {
      setBoard(resetBoard());
      setStep(0);
    } else {
      setStep(next);
    }
  }, 2600);
  return () => clearInterval(id);
}, [reduced, step]);

// Measure + launch the current flight; commit the move when it lands.
useLayoutEffect(() => {
  if (reduced) return;
  const position = DRAG_SEQUENCE[step];
  const container = containerRef.current;
  const source = cardRefs.current.get(position);
  const srcCol = board.findIndex((col) =>
    col.cards.some((card) => card.position === position),
  );
  const destCol = srcCol + 1;
  const destList = listRefs.current.get(destCol);
  if (!container || !source || !destList || srcCol === -1 || destCol >= board.length) return;
  const card = board[srcCol].cards.find((c) => c.position === position);
  if (!card) return;

  const cRect = container.getBoundingClientRect();
  const sRect = source.getBoundingClientRect();
  const dRect = destList.getBoundingClientRect();

  // Land at the bottom of the last card already in the destination (else list top).
  const destCards = board[destCol].cards;
  const lastCard = destCards.length
    ? cardRefs.current.get(destCards[destCards.length - 1].position)
    : null;
  const landingTop = (lastCard?.getBoundingClientRect().bottom ?? dRect.top) + 8;

  setFlight({
    position,
    card,
    left: sRect.left - cRect.left,
    top: sRect.top - cRect.top,
    width: sRect.width,
    dx: dRect.left - sRect.left,
    dy: landingTop - sRect.top,
  });
  setMoving(false);

  const raf = requestAnimationFrame(() => setMoving(true));
  const commit = setTimeout(() => {
    setBoard((b) => moveCardForward(b, position));
    setFlight(null);
    setMoving(false);
  }, 900);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(commit);
  };
  // NOTE: `board` intentionally left out of deps — the commit must not retrigger
  // a flight; the next flight only starts when `step` advances.
}, [step, reduced]);
```

Note: `useLayoutEffect` returns `void | (() => void)`; `clearTimeout` returns `void` so the arrow cleanup is fine.

- [ ] **Step 3: Render from `board` and key refs by position**

In the JSX, change the column map to iterate `board` instead of `COLUMNS`:

```tsx
{board.map((column, colIndex) => (
  <div key={column.name} className="w-52 shrink-0 space-y-3 sm:w-56">
    <div className="flex items-center justify-between gap-1 px-1">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
        <span className={cn("size-2 shrink-0 rounded-full", COLUMN_COLORS[column.color].dot)} />
        <span className="truncate">{column.name}</span>
      </div>
      <span className="text-xs text-muted-foreground">{column.cards.length}</span>
    </div>
    <div
      ref={(el) => {
        if (el) listRefs.current.set(colIndex, el);
        else listRefs.current.delete(colIndex);
      }}
      className="space-y-2"
    >
      {column.cards.map((card) => (
        <MockCardBody
          key={card.position}
          card={card}
          ghost={!reduced && ghostPosition === card.position}
          ref={(el) => {
            if (el) cardRefs.current.set(card.position, el);
            else cardRefs.current.delete(card.position);
          }}
        />
      ))}
    </div>
  </div>
))}
```

Replace `const ghostKey = flight?.key ?? null;` with `const ghostPosition = flight?.position ?? null;`.

- [ ] **Step 4: Verify**

Run: `bun lint`
Expected: no errors.

Run: `bun test`
Expected: all tests pass.

Run: `bun build`
Expected: production build succeeds (this type-checks the JSX changes).

Manual check in dev (`bun dev`): the board shows a card flying to the next column, the destination card count increments, it holds ~1.7s, then the next card drags. After the 6th drop the board resets to the original layout and loops. With reduced-motion enabled the board stays static.

- [ ] **Step 5: Commit**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "feat(showcase): real kanban drop animation with hold + reset loop"
```
