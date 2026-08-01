"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

interface ScoreResult {
  ats: number;
  completeness: number;
  impact: number;
  balance: number;
  tips: string[];
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  const color =
    value >= 75
      ? "text-green-500"
      : value >= 50
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-16">
        <svg
          className="size-full -rotate-90"
          viewBox="0 0 72 72"
          role="img"
          aria-label={`${label}: ${value} dari 100`}
        >
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${filled} ${circumference}`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}
        >
          {value}
        </span>
      </div>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function AiScoreCard() {
  const getContent = useCvStore((s) => s.getContent);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const utils = trpc.useUtils();
  const mutation = trpc.ai.score.useMutation({
    onSuccess: (data) => setScore(data),
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });

  function runScore() {
    mutation.mutate({ cvSnapshot: buildSnapshot(getContent()) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Skor CV</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={runScore}
          loading={mutation.isPending}
          loadingText="Menganalisis..."
        >
          Analisis Sekarang
        </Button>
      </div>

      {score ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <ScoreRing label="ATS" value={score.ats} />
            <ScoreRing label="Kelengkapan" value={score.completeness} />
            <ScoreRing label="Dampak" value={score.impact} />
            <ScoreRing label="Proporsi" value={score.balance} />
          </div>
          {score.tips.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-1.5 text-xs font-medium">Rekomendasi:</p>
              <ul className="space-y-1">
                {score.tips.map((tip) => (
                  <li key={tip} className="text-xs text-muted-foreground">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Klik "Analisis Sekarang" untuk mendapatkan skor dan rekomendasi
          perbaikan CV Anda.
        </p>
      )}

      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}
    </div>
  );
}
