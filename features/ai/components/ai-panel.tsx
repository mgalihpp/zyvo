"use client";

import { GaugeIcon, MessageSquareIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiChat } from "./ai-chat";
import { AiQuotaLine } from "./ai-quota-line";
import { AiScoreCard } from "./ai-score-card";

export function AiPanel() {
  return (
    <Tabs defaultValue="score" className="h-full gap-0">
      <TabsList className="m-4 mb-0 w-[calc(100%-2rem)]">
        <TabsTrigger value="score">
          <GaugeIcon aria-hidden="true" />
          Skor CV
        </TabsTrigger>
        <TabsTrigger value="chat">
          <MessageSquareIcon aria-hidden="true" />
          AI Chat
        </TabsTrigger>
      </TabsList>
      <AiQuotaLine className="px-4 pt-2 text-xs text-muted-foreground" />
      <TabsContent value="score" className="min-h-0 overflow-y-auto p-4">
        <AiScoreCard />
      </TabsContent>
      <TabsContent value="chat" className="min-h-0 overflow-y-auto p-4">
        <AiChat />
      </TabsContent>
    </Tabs>
  );
}
