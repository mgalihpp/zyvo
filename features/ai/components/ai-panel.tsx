"use client";

import { GaugeIcon, MessageSquareIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiChat } from "./ai-chat";
import { AiScoreCard } from "./ai-score-card";
import { AiUsageIndicator } from "./ai-usage-indicator";

export function AiPanel() {
  return (
    <Tabs defaultValue="score" className="h-full gap-0">
      <div className="flex items-center gap-1 p-4 pb-0">
        <TabsList className="min-w-0 flex-1">
          <TabsTrigger value="score">
            <GaugeIcon aria-hidden="true" />
            Skor CV
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquareIcon aria-hidden="true" />
            AI Chat
          </TabsTrigger>
        </TabsList>
        <AiUsageIndicator align="end" />
      </div>
      <TabsContent value="score" className="min-h-0 overflow-y-auto p-4">
        <AiScoreCard />
      </TabsContent>
      <TabsContent value="chat" className="min-h-0 overflow-y-auto p-4">
        <AiChat />
      </TabsContent>
    </Tabs>
  );
}
