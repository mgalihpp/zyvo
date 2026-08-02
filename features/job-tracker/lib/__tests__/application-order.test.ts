import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateOrderShifts } from "@/features/job-tracker/lib/application-order";

test("moving a card down shifts the cards between both positions up", () => {
  assert.deepEqual(
    calculateOrderShifts({
      sourceColumnId: "todo",
      targetColumnId: "todo",
      sourceOrder: 1,
      targetOrder: 4,
    }),
    {
      source: {
        columnId: "todo",
        order: { gt: 1, lte: 4 },
        direction: "decrement",
      },
    },
  );
});

test("moving a card up shifts the cards between both positions down", () => {
  assert.deepEqual(
    calculateOrderShifts({
      sourceColumnId: "todo",
      targetColumnId: "todo",
      sourceOrder: 4,
      targetOrder: 1,
    }),
    {
      source: {
        columnId: "todo",
        order: { gte: 1, lt: 4 },
        direction: "increment",
      },
    },
  );
});

test("moving a card to another column closes the source gap and opens the target slot", () => {
  assert.deepEqual(
    calculateOrderShifts({
      sourceColumnId: "todo",
      targetColumnId: "interview",
      sourceOrder: 2,
      targetOrder: 1,
    }),
    {
      source: {
        columnId: "todo",
        order: { gt: 2 },
        direction: "decrement",
      },
      target: {
        columnId: "interview",
        order: { gte: 1 },
        direction: "increment",
      },
    },
  );
});
