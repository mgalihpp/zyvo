import { PROTECTED_KINDS } from "@/features/job-tracker/lib/default-columns";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";

export type AppLike = { columnId: string; followUpDate: Date | null };

/** Funnel counts in fixed kind order; custom columns are excluded. */
export function computeFunnel(columns: BoardColumn[], apps: AppLike[]) {
  const countByColumn = new Map<string, number>();
  for (const app of apps) {
    countByColumn.set(app.columnId, (countByColumn.get(app.columnId) ?? 0) + 1);
  }
  return PROTECTED_KINDS.map((kind) => {
    const col = columns.find((c) => c.kind === kind);
    return {
      kind,
      label: col?.name ?? kind,
      count: col ? (countByColumn.get(col.id) ?? 0) : 0,
    };
  });
}

export function countDueFollowUps(apps: AppLike[], now: Date): number {
  return apps.filter((a) => a.followUpDate !== null && a.followUpDate <= now)
    .length;
}
