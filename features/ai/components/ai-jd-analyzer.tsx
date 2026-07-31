"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

interface JdResult {
  score: number;
  matchedKeywords: string[];
  gaps: string[];
  recommendations: string[];
}

export function AiJdAnalyzer() {
  const getContent = useCvStore((s) => s.getContent);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<JdResult | null>(null);

  const mutation = trpc.ai.analyzeJD.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function analyze() {
    if (!jdText.trim()) return;
    mutation.mutate({
      jdText: jdText.slice(0, 3000),
      cvSnapshot: buildSnapshot(getContent()),
    });
  }

  const scoreColor = !result
    ? ""
    : result.score >= 75
      ? "text-green-600"
      : result.score >= 50
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Analisis Kesesuaian Lowongan</h3>
      <Textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste deskripsi pekerjaan di sini..."
        className="min-h-[100px] resize-none text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={analyze}
        disabled={!jdText.trim()}
        loading={mutation.isPending}
        loadingText="Menganalisis..."
      >
        Analisis Kesesuaian
      </Button>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Skor kesesuaian:
            </span>
            <span className={`text-lg font-bold ${scoreColor}`}>
              {result.score}%
            </span>
          </div>

          {result.matchedKeywords.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-700">
                Keyword yang cocok:
              </p>
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-red-700">
                Gap yang perlu diisi:
              </p>
              <ul className="space-y-0.5">
                {result.gaps.map((gap) => (
                  <li key={gap} className="text-xs text-muted-foreground">
                    • {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-1 text-xs font-medium">Rekomendasi:</p>
              <ul className="space-y-1">
                {result.recommendations.map((rec) => (
                  <li key={rec} className="text-xs text-muted-foreground">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}
    </div>
  );
}
