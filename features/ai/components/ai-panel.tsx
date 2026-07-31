"use client";

import { AiChat } from "./ai-chat";
import { AiJdAnalyzer } from "./ai-jd-analyzer";
import { AiScoreCard } from "./ai-score-card";

export function AiPanel() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <AiScoreCard />
      <div className="border-t" />
      <AiJdAnalyzer />
      <div className="border-t" />
      <AiChat />
    </div>
  );
}
