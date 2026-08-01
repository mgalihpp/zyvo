import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import {
  applicationInputSchema,
  boardColumnSchema,
  moveApplicationSchema,
} from "@/features/job-tracker/schemas/job-tracker";

test("createDefaultColumns returns 5 ordered columns with fixed kinds", () => {
  let i = 0;
  const cols = createDefaultColumns(() => `id-${i++}`);
  assert.equal(cols.length, 5);
  assert.deepEqual(
    cols.map((c) => c.kind),
    ["applied", "interview", "offer", "accepted", "rejected"],
  );
  assert.deepEqual(
    cols.map((c) => c.name),
    ["Dilamar", "Interview", "Offer", "Diterima", "Ditolak"],
  );
  assert.deepEqual(
    cols.map((c) => c.order),
    [0, 1, 2, 3, 4],
  );
  for (const c of cols)
    assert.equal(boardColumnSchema.safeParse(c).success, true);
});

test("applicationInputSchema requires company and position", () => {
  assert.equal(
    applicationInputSchema.safeParse({ company: "", position: "Dev" }).success,
    false,
  );
  const ok = applicationInputSchema.safeParse({
    company: "Acme",
    position: "Frontend Dev",
    workType: "remote",
    salaryMin: 5_000_000,
  });
  assert.equal(ok.success, true);
});

test("applicationInputSchema rejects invalid workType and negative salary", () => {
  assert.equal(
    applicationInputSchema.safeParse({
      company: "Acme",
      position: "Dev",
      workType: "on-site",
    }).success,
    false,
  );
  assert.equal(
    applicationInputSchema.safeParse({
      company: "Acme",
      position: "Dev",
      salaryMin: -1,
    }).success,
    false,
  );
});

test("moveApplicationSchema shape", () => {
  const ok = moveApplicationSchema.safeParse({
    id: "abc",
    columnId: "col-1",
    order: 0,
  });
  assert.equal(ok.success, true);
});
