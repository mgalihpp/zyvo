import { strict as assert } from "node:assert";
import { test } from "node:test";
import { applicationsToCsv } from "@/features/job-tracker/lib/csv";
import { createDefaultColumns } from "@/features/job-tracker/lib/default-columns";
import {
  computeFunnel,
  countDueFollowUps,
} from "@/features/job-tracker/lib/stats";

let n = 0;
const cols = createDefaultColumns(() => `c${n++}`);
const appliedId = cols[0].id;
const interviewId = cols[1].id;

test("computeFunnel counts per kind and excludes custom columns", () => {
  const withCustom = [
    ...cols,
    { id: "cx", name: "Wishlist", kind: "custom" as const, order: 5 },
  ];
  const apps = [
    { columnId: appliedId, followUpDate: null },
    { columnId: appliedId, followUpDate: null },
    { columnId: interviewId, followUpDate: null },
    { columnId: "cx", followUpDate: null },
  ];
  const funnel = computeFunnel(withCustom, apps);
  assert.deepEqual(
    funnel.map((f) => f.kind),
    ["applied", "interview", "offer", "accepted", "rejected"],
  );
  assert.equal(funnel[0].count, 2);
  assert.equal(funnel[1].count, 1);
  assert.equal(funnel[2].count, 0);
});

test("countDueFollowUps counts only due dates", () => {
  const now = new Date("2026-07-31T00:00:00Z");
  const apps = [
    { columnId: appliedId, followUpDate: new Date("2026-07-30T00:00:00Z") },
    { columnId: appliedId, followUpDate: new Date("2026-08-05T00:00:00Z") },
    { columnId: appliedId, followUpDate: null },
  ];
  assert.equal(countDueFollowUps(apps, now), 1);
});

test("applicationsToCsv escapes quotes and commas", () => {
  const csv = applicationsToCsv([
    {
      company: 'Acme, "Inc"',
      position: "Dev",
      columnName: "Dilamar",
      jobUrl: null,
      location: null,
      workType: "remote",
      salaryMin: 5000000,
      salaryMax: null,
      appliedAt: new Date("2026-07-01T00:00:00Z"),
      followUpDate: null,
    },
  ]);
  const lines = csv.split("\n");
  assert.equal(
    lines[0],
    "Perusahaan,Posisi,Status,URL,Lokasi,Tipe Kerja,Gaji Min,Gaji Max,Tanggal Lamar,Follow-up",
  );
  assert.ok(lines[1].startsWith('"Acme, ""Inc""",Dev,Dilamar,'));
});
