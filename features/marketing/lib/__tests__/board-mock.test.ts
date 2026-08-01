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
