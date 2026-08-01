# Landing Board Drag Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pulsing-spotlight animation in the landing-page Job Tracker board mock with a looping "drag" animation where cards lift and glide one column forward, and fix the ring-clipping bug on the leftmost column.

**Architecture:** The board stays visually static. A single absolutely-positioned floating clone of the "active" card animates over the top of the board via a JS-driven inline `transform: translate()` transition, measured live with `getBoundingClientRect` so it adapts to responsive widths and card heights. No DOM reflow. A rotation cursor advances every ~2.6s picking the next source card + forward destination column. Reduced-motion renders the static board.

**Tech Stack:** React 19.2 (Compiler enabled), Next.js 16, Tailwind v4, lucide-react, CSS `@keyframes` in `app/globals.css`.

## Global Constraints

- Component is a self-contained client mock: NO job-tracker store, NO tRPC, NO network. (`features/marketing/components/job-tracker-showcase.tsx` is `"use client"`.)
- Tailwind v4: only literal class strings survive — do NOT build color classes dynamically. Reuse `COLUMN_COLORS[color].dot` exactly as today.
- Honor `prefers-reduced-motion: reduce` — skip animation, render static board. Reuse the existing `matchMedia` pattern from `useCycle`.
- React Compiler is on: do not add manual `useMemo`/`useCallback` for perf; write plain code. Refs and effects are fine.
- Indonesian UI copy stays as-is ("Lamaran Saya", "Tersinkron", column names).
- Use `bun` for commands. Lint via `bun lint` (Biome).

---

### Task 1: Fix ring clipping on the board scroll row

**Files:**
- Modify: `features/marketing/components/job-tracker-showcase.tsx` (the `flex items-start gap-3 overflow-x-auto pb-1 sm:gap-4` row inside `BoardMock`, ~line 177)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new. Pure styling change.

- [ ] **Step 1: Add inner breathing room to the scroll row**

The board container (`BoardMock`'s outer `div`) has `overflow-hidden` + padding, which clips the ring/shadow of cards in the leftmost ("Dilamar") column. Give the scroll row horizontal padding that cancels against a negative margin so rings and lifted-card shadows have room without shifting layout.

Change the row's className from:

```tsx
<div className="flex items-start gap-3 overflow-x-auto pb-1 sm:gap-4">
```

to:

```tsx
<div className="-mx-1 flex items-start gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
```

(`px-1 -mx-1` adds inner room without moving columns; `pb-2` gives the bottom ring/shadow clearance too.)

- [ ] **Step 2: Verify in the browser**

Run: `bun dev` (if not already running), open `http://localhost:3000/#job-tracker`.
Expected: the spotlight ring on the first "Dilamar" card is no longer clipped on its left/bottom edge. (Spotlight is still the old animation at this point — that's replaced in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "fix(showcase): stop clipping card ring on leftmost board column"
```

---

### Task 2: Add the grab-cursor bob keyframe

**Files:**
- Modify: `app/globals.css` (add after the existing `mock-*` keyframes, near line 308)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS class `mock-drag-cursor` (applies `animation: mock-drag-cursor 1.4s ease-in-out infinite`) — consumed by the hand glyph in Task 3.

- [ ] **Step 1: Add the keyframe + class**

Add to `app/globals.css` after the `mock-progress` keyframe block:

```css
/* Subtle grab bob for the drag-mock's hand cursor. */
@keyframes mock-drag-cursor {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-1px, -2px) scale(0.94);
  }
}
.mock-drag-cursor {
  animation: mock-drag-cursor 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .mock-drag-cursor {
    animation: none;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `bun lint`
Expected: no new errors from `globals.css`.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(showcase): add grab-cursor bob keyframe for drag mock"
```

---

### Task 3: Replace spotlight with the floating drag animation

**Files:**
- Modify: `features/marketing/components/job-tracker-showcase.tsx` (rewrite `BoardMock` and `MockCardBody`; remove `useCycle` + `FLAT_CARDS`; add `HandIcon` import)

**Interfaces:**
- Consumes: `COLUMNS`, `COLUMN_COLORS`, `MockCard`/`MockColumn` types (unchanged); `mock-drag-cursor` class from Task 2; `-mx-1 px-1` scroll row from Task 1.
- Produces: self-contained `BoardMock` with drag animation. No exported surface change (still rendered by `JobTrackerShowcase`).

- [ ] **Step 1: Remove the spotlight machinery**

Delete the `useCycle` function (lines ~26-38) and the `FLAT_CARDS` constant (lines ~115-118). Remove the `active` prop from `MockCardBody` and its `active`/`mock-pulse`/`ring-2` branch — the card body keeps only its base + `hover` styles and `border-border`.

Updated `MockCardBody` signature and body:

```tsx
const MockCardBody = forwardRef<
  HTMLDivElement,
  { card: MockCard; ghost?: boolean; floating?: boolean }
>(function MockCardBody({ card, ghost, floating }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background p-3 shadow-sm transition-all duration-300",
        !floating && "hover:-translate-y-0.5 hover:shadow-md",
        ghost && "border-dashed opacity-40",
        floating
          ? "border-primary shadow-xl ring-2 ring-primary/50"
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
});
```

Add `forwardRef` to the React import and `HandIcon` to the lucide import:

```tsx
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
```
```tsx
import {
  ArrowRightIcon,
  BarChart3Icon,
  HandIcon,
  KanbanSquareIcon,
  MailIcon,
  SheetIcon,
} from "lucide-react";
```

- [ ] **Step 2: Add the drag-sequence constant**

Above `BoardMock`, define the rotation of forward hops (each entry = a source card by column+card index; destination is always the next column forward). Only pick sources whose column has a forward neighbor (skip the last column "Diterima").

```tsx
/** Ordered rotation of "drags": each card hops to the next column forward.
 *  `col` must be < COLUMNS.length - 1 (needs a forward neighbor). */
const DRAG_SEQUENCE: { col: number; card: number }[] = [
  { col: 0, card: 2 }, // Data Analyst · Bukalapak → Interview
  { col: 1, card: 1 }, // UX Researcher · Blibli → Offer
  { col: 0, card: 0 }, // Frontend Engineer · Tokopedia → Interview
  { col: 2, card: 0 }, // Senior Fullstack · Ruangguru → Diterima
  { col: 0, card: 1 }, // Product Designer · Gojek → Interview
  { col: 1, card: 0 }, // Backend Engineer · Traveloka → Offer
];
```

- [ ] **Step 3: Rewrite `BoardMock` with the floating-overlay logic**

Replace the entire `BoardMock` function. Key mechanics:
- `containerRef` on the relative board area; `cardRefs` map keyed `"{col}-{card}"`; `listRefs` map keyed by column index (the target column's card-list wrapper) for the destination anchor.
- `step` state advances every 2600ms (skipped under reduced motion).
- On each `step`, in `useLayoutEffect`, measure source card rect and destination anchor rect relative to the container; set `flight` state `{ card, from:{x,y,w}, to:{x,y} }`. Toggle `moving` on next frame to trigger the CSS transition. Mark the source card index as `ghost` while in flight.

```tsx
function BoardMock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(0);
  const [flight, setFlight] = useState<{
    key: string;
    card: MockCard;
    left: number;
    top: number;
    width: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [moving, setMoving] = useState(false);

  // Respect reduced motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Advance the drag rotation.
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(
      () => setStep((s) => (s + 1) % DRAG_SEQUENCE.length),
      2600,
    );
    return () => clearInterval(id);
  }, [reduced]);

  // Measure + launch the current flight.
  useLayoutEffect(() => {
    if (reduced) return;
    const seq = DRAG_SEQUENCE[step];
    const container = containerRef.current;
    const source = cardRefs.current.get(`${seq.col}-${seq.card}`);
    const destList = listRefs.current.get(seq.col + 1);
    if (!container || !source || !destList) return;

    const cRect = container.getBoundingClientRect();
    const sRect = source.getBoundingClientRect();
    const dRect = destList.getBoundingClientRect();

    const left = sRect.left - cRect.left;
    const top = sRect.top - cRect.top;
    const dx = dRect.left - sRect.left;
    // Land just below the destination column's existing first card.
    const dy = dRect.top - sRect.top;

    setFlight({
      key: `${seq.col}-${seq.card}`,
      card: COLUMNS[seq.col].cards[seq.card],
      left,
      top,
      width: sRect.width,
      dx,
      dy,
    });
    setMoving(false);

    const raf = requestAnimationFrame(() => setMoving(true));
    return () => cancelAnimationFrame(raf);
  }, [step, reduced]);

  const ghostKey = flight?.key ?? null;

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

      <div ref={containerRef} className="relative">
        <div className="-mx-1 flex items-start gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
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
              <div
                ref={(el) => {
                  if (el) listRefs.current.set(colIndex, el);
                  else listRefs.current.delete(colIndex);
                }}
                className="space-y-2"
              >
                {column.cards.map((card, cardIndex) => {
                  const key = `${colIndex}-${cardIndex}`;
                  return (
                    <MockCardBody
                      key={card.position}
                      card={card}
                      ghost={!reduced && ghostKey === key}
                      ref={(el) => {
                        if (el) cardRefs.current.set(key, el);
                        else cardRefs.current.delete(key);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Floating dragged card. */}
        {!reduced && flight && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-10"
            style={{
              width: flight.width,
              transform: `translate(${flight.left + (moving ? flight.dx : 0)}px, ${flight.top + (moving ? flight.dy : 0)}px) rotate(${moving ? -2 : 0}deg) scale(${moving ? 1.05 : 1})`,
              transition: moving
                ? "transform 900ms cubic-bezier(0.16, 1, 0.3, 1)"
                : "none",
            }}
          >
            <div className="relative">
              <MockCardBody card={flight.card} floating />
              <HandIcon className="mock-drag-cursor absolute -bottom-2 -right-2 size-5 text-primary drop-shadow-sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `bun lint`
Expected: no errors. If Biome flags the `ref` callback returning a value, ensure the callback body uses `{ }` (statement, not implicit return) as written above.

- [ ] **Step 5: Verify in the browser**

Open `http://localhost:3000/#job-tracker`. Expected:
- No pulsing spotlight anymore.
- Every ~2.6s a different card lifts (scale + slight tilt + shadow) with a small grabbing hand at its corner, glides into the next column forward, while its origin shows a dashed ghost gap.
- Leftmost-column drags are not clipped.
- Toggle OS "reduce motion" → board renders static, no floating card, no errors.

- [ ] **Step 6: Commit**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "feat(showcase): drag-style board animation with grab cursor"
```

---

### Task 4: Final polish pass + full lint/build

**Files:**
- Possibly modify: `features/marketing/components/job-tracker-showcase.tsx` (tuning only)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new.

- [ ] **Step 1: Tune the landing (dy) offset if needed**

If the floating card lands overlapping the destination column's existing first card rather than reading as "dropped at the top of the column," nudge `dy` to land just under the column header instead of exactly on the list top. Keep it measured (no hardcoded pixels beyond a small constant like `+ 4`). This step is only applied if Step-5 verification in Task 3 looked off; otherwise leave as-is and note "no change needed."

- [ ] **Step 2: Full lint**

Run: `bun lint`
Expected: clean (no new warnings/errors introduced by this feature).

- [ ] **Step 3: Production build sanity**

Run: `bun build`
Expected: build succeeds. (Catches any React Compiler / RSC serialization issues on the landing page.)

- [ ] **Step 4: Commit any tuning**

```bash
git add features/marketing/components/job-tracker-showcase.tsx
git commit -m "polish(showcase): tune drag landing offset"
```

(Skip this commit if Step 1 made no change.)

---

## Self-Review Notes

- **Spec coverage:** Fix #1 ring clipping → Task 1. Drag behavior (rotating, one-column-forward) → Task 3 (`DRAG_SEQUENCE` + interval). Floating overlay, no reflow → Task 3. Lift/glide + grabbing hand → Task 3 (`floating` style + `HandIcon`) & Task 2 (bob keyframe). Dashed ghost placeholder → Task 3 (`ghost` prop). Reduced motion → Task 3 (`reduced` gate) & Task 2 (media query). New CSS keyframe → Task 2. Self-contained (no store/tRPC) → unchanged, enforced by Global Constraints. All covered.
- **Placeholder scan:** none — all code is concrete. Task 4 Step 1 is explicitly conditional tuning, not a placeholder.
- **Type consistency:** `MockCardBody` now `forwardRef` with `{ card, ghost?, floating? }`; all call sites updated (real cards pass `ghost`+`ref`, floating passes `floating`). `flight` shape (`key,card,left,top,width,dx,dy`) is defined and consumed in the same task. `DRAG_SEQUENCE` entries (`col`,`card`) consumed in the measure effect. `listRefs`/`cardRefs` keys consistent (`"{col}-{card}"` and column index).
