# Landing Page — Job Tracker Board Mock: Real Drop Animation

Date: 2026-08-01
Status: Approved

## Goal

Upgrade the landing-page Job Tracker board mock (`BoardMock` in
`features/marketing/components/job-tracker-showcase.tsx`). Today the mock flies a
floating card clone to the next column but never lands it — the source card stays
ghosted and the board resets each cycle, so it reads as "gak ada drop". Make it a
real kanban-style move:

1. **Real drop.** The dragged card actually leaves the source column and appears
   in the destination column.
2. **Insert, not replace.** The card appends to the end of the destination
   column's card list, like a normal kanban drop.
3. **Persist + loop.** After a drop the new board state holds for a couple of
   seconds, then the next card drags. After the full sequence the board resets to
   the original layout and loops forever.

Self-contained mock: no store, no tRPC — safe on the public landing page.

## Behavior

- Same cadence as today: ~2.6s per cycle drives the loop; the ~900ms flight is
  the drag, the rest is the hold.
- Each cycle picks the next card from a rotation, lifts it, flies it one column
  forward, and **commits the move** when it lands.
- Dropped card goes to the **end** of the destination column's list.
- After the last card in the rotation commits, the board resets to the original
  `COLUMNS` layout and the rotation restarts. Infinite loop.
- `prefers-reduced-motion: reduce` → static board, no loop, current behavior.

## Data model

- Replace `DRAG_SEQUENCE` (currently `{ col, card }` indexes) with an array of
  card **`position`** strings. Indexes break once cards move columns; every
  position on the board is unique, so positions are stable ids.
- New state `board: MockColumn[]`, initialized as a deep copy of `COLUMNS`.
  `board` drives the rendered cards and per-column counts. The flight's source
  rect and destination list are measured from `board`'s current layout.
- Each card moves exactly once per cycle, so no position collisions.

## Flow per card

1. Interval (2600ms) advances `step` → current card from the rotation.
2. `useLayoutEffect` (on `step`): locate the card's current column in `board`,
   measure source card rect + destination column list rect (relative to the
   board container), set `flight` = floating clone at source position; set
   `moving=false`, then rAF → `moving=true`. Source card renders as the dashed
   ghost while the clone is in flight.
3. `setTimeout(~900ms)` = drop: remove card from source column, push to end of
   destination column, clear `flight`. Card genuinely appears in destination.
4. Hold until the next interval tick → next card.
5. After the final card commits: reset `board` to a deep copy of `COLUMNS` and
   `step` back to 0.

## Visual treatment

- Keep the current floating-clone travel (scale 1.05, rotate -2deg, grab hand,
  shadow). The only change is the landing: instead of the clone fading out and
  the board resetting, the move commits into the board state.
- Ghost placeholder in the source column while the clone is in flight; gone once
  the move commits.
- Column counts re-render naturally from `board`.

## Files touched

- `features/marketing/components/job-tracker-showcase.tsx` — only this file.
  `BoardMock` gains the `board` state + commit-on-land logic; `DRAG_SEQUENCE`
  becomes position ids.
- No new CSS (the `mock-drag-cursor` keyframe already exists).

## Out of scope

- No real user drag-and-drop; still an autonomous showcase.
- No changes to the in-app Kanban board or `BoardPreview`.
- No changes to feature highlights, funnel card, or CTA.
- No new dependencies.
