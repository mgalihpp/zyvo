import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";

/** Kinds that map to the conversion funnel and cannot be deleted. */
export const PROTECTED_KINDS = [
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
] as const;

const DEFAULTS: { name: string; kind: BoardColumn["kind"] }[] = [
  { name: "Dilamar", kind: "applied" },
  { name: "Interview", kind: "interview" },
  { name: "Offer", kind: "offer" },
  { name: "Diterima", kind: "accepted" },
  { name: "Ditolak", kind: "rejected" },
];

/** Build the 5 default columns. `idFactory` is injected so tests stay deterministic. */
export function createDefaultColumns(idFactory: () => string): BoardColumn[] {
  return DEFAULTS.map((d, order) => ({ id: idFactory(), ...d, order }));
}
