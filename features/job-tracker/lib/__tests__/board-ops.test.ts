import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  resolveOrphanTarget,
  validateColumnUpdate,
} from "@/features/job-tracker/lib/board-ops";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";

let n = 0;
const mkId = () => `c${n++}`;
const base = () => {
  n = 0;
  return createDefaultColumns(mkId);
};

test("rename and reorder of protected columns is allowed", () => {
  const cur = base();
  const next = cur.map((c, i) =>
    c.kind === "applied"
      ? { ...c, name: "Lamaran Masuk", order: 4 }
      : { ...c, order: i === 4 ? 0 : c.order },
  );
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, true);
});

test("deleting a protected column is rejected", () => {
  const cur = base();
  const next = cur.filter((c) => c.kind !== "offer");
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, false);
});

test("changing a protected column's kind is rejected", () => {
  const cur = base();
  const next = cur.map((c) =>
    c.kind === "offer" ? { ...c, kind: "custom" as const } : c,
  );
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, false);
});

test("new columns must be kind custom", () => {
  const cur = base();
  const bad = [
    ...cur,
    { id: "x", name: "Extra", kind: "offer" as const, order: 5 },
  ];
  assert.equal(validateColumnUpdate(cur, bad).ok, false);
  const good = [
    ...cur,
    { id: "x", name: "Extra", kind: "custom" as const, order: 5 },
  ];
  assert.equal(validateColumnUpdate(cur, good).ok, true);
});

test("deleting a custom column reports its id", () => {
  const cur = [
    ...base(),
    { id: "cx", name: "Extra", kind: "custom" as const, order: 5 },
  ];
  const next = cur.filter((c) => c.id !== "cx");
  const res = validateColumnUpdate(cur, next);
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.removedColumnIds, ["cx"]);
});

test("duplicate order values are rejected", () => {
  const cur = base();
  const next = cur.map((c) => ({ ...c, order: 0 }));
  assert.equal(validateColumnUpdate(cur, next).ok, false);
});

test("resolveOrphanTarget picks lowest-order column id", () => {
  const cols = base().map((c) => ({ ...c, order: 4 - c.order }));
  // rejected now has order 0
  assert.equal(resolveOrphanTarget(cols), cols.find((c) => c.order === 0)?.id);
});
