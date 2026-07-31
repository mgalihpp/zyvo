"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiInterviewModal({ open, onClose }: Props) {
  const getContent = useCvStore((s) => s.getContent);
  const [jdText, setJdText] = useState("");
  const [questions, setQuestions] = useState<
    { question: string; tip: string }[]
  >([]);

  const mutation = trpc.ai.interviewPrep.useMutation({
    onSuccess: (data) => setQuestions(data.questions),
  });

  function generate() {
    mutation.mutate({ cvSnapshot: buildSnapshot(getContent()), jdText });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl" scrollable>
        <DialogHeader>
          <DialogTitle>Persiapan Wawancara</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-xs font-medium">
              Deskripsi pekerjaan (opsional)
            </span>
            <Textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste deskripsi pekerjaan untuk pertanyaan yang lebih relevan..."
              className="min-h-[80px] resize-none text-xs"
            />
          </div>

          <Button
            className="w-full"
            onClick={generate}
            loading={mutation.isPending}
            loadingText="Membuat pertanyaan..."
          >
            Generate 10 Pertanyaan Interview
          </Button>

          {questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div
                  key={q.question}
                  className="space-y-1.5 rounded-lg border p-3"
                >
                  <p className="text-sm font-medium">
                    {i + 1}. {q.question}
                  </p>
                  <p className="text-xs text-muted-foreground">💡 {q.tip}</p>
                </div>
              ))}
            </div>
          )}

          {mutation.error && (
            <p className="text-xs text-destructive">{mutation.error.message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
