export function getAiUsageState({
  used,
  limit,
}: {
  used: number;
  limit: number | null;
}) {
  if (limit === null) {
    return { kind: "unlimited" as const, progressValue: null };
  }

  return {
    kind: "limited" as const,
    used,
    limit,
    progressValue: limit === 0 ? 0 : Math.min(100, (used / limit) * 100),
  };
}
