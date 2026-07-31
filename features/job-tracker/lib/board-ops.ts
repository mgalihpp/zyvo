import { PROTECTED_KINDS } from "@/features/job-tracker/lib/default-columns";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";

type ValidationResult =
  | { ok: true; removedColumnIds: string[] }
  | { ok: false; message: string };

/**
 * Validate a full-column replacement coming from the client.
 * Protected (funnel) columns may be renamed/reordered but never removed and
 * never change kind. New columns must be kind "custom". Orders must be unique.
 */
export function validateColumnUpdate(
  current: BoardColumn[],
  next: BoardColumn[],
): ValidationResult {
  const nextById = new Map(next.map((c) => [c.id, c]));

  for (const cur of current) {
    const upd = nextById.get(cur.id);
    if ((PROTECTED_KINDS as readonly string[]).includes(cur.kind)) {
      if (!upd) {
        return { ok: false, message: "Kolom bawaan tidak bisa dihapus" };
      }
      if (upd.kind !== cur.kind) {
        return { ok: false, message: "Jenis kolom bawaan tidak bisa diubah" };
      }
    }
  }

  const currentIds = new Set(current.map((c) => c.id));
  for (const col of next) {
    if (!currentIds.has(col.id) && col.kind !== "custom") {
      return { ok: false, message: "Kolom baru harus berjenis custom" };
    }
  }

  const orders = next.map((c) => c.order);
  if (new Set(orders).size !== orders.length) {
    return { ok: false, message: "Urutan kolom tidak valid" };
  }

  const nextIds = new Set(next.map((c) => c.id));
  const removedColumnIds = current
    .filter((c) => !nextIds.has(c.id))
    .map((c) => c.id);

  return { ok: true, removedColumnIds };
}

/** Where cards from deleted columns go: the lowest-order remaining column. */
export function resolveOrphanTarget(next: BoardColumn[]): string {
  const sorted = [...next].sort((a, b) => a.order - b.order);
  return sorted[0].id;
}
