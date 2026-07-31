"use client";

import { FileTextIcon, MessageSquareIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AiChat } from "./ai-chat";
import { AiCoverLetterModal } from "./ai-cover-letter-modal";
import { AiInterviewModal } from "./ai-interview-modal";
import { AiJdAnalyzer } from "./ai-jd-analyzer";
import { AiScoreCard } from "./ai-score-card";

export function AiPanel() {
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setCoverLetterOpen(true)}>
          <FileTextIcon />
          Surat Lamaran
        </Button>
        <Button variant="outline" onClick={() => setInterviewOpen(true)}>
          <MessageSquareIcon />
          Interview Prep
        </Button>
      </div>
      <AiScoreCard />
      <div className="border-t" />
      <AiJdAnalyzer />
      <div className="border-t" />
      <AiChat />

      <AiCoverLetterModal
        open={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
      />
      <AiInterviewModal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
      />
    </div>
  );
}
