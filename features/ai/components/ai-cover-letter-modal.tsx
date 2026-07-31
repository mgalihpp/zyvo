"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiCoverLetterModal({ open, onClose }: Props) {
  const getContent = useCvStore((s) => s.getContent);
  const [jdText, setJdText] = useState("");
  const [tone, setTone] = useState<"formal" | "casual" | "creative">("formal");
  const [result, setResult] = useState("");

  const mutation = trpc.ai.coverLetter.useMutation({
    onSuccess: ({ result: text }) => setResult(text),
  });

  function generate() {
    mutation.mutate({
      cvSnapshot: buildSnapshot(getContent()),
      jdText,
      tone,
    });
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(result);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl" scrollable>
        <DialogHeader>
          <DialogTitle>Buat Surat Lamaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-xs font-medium">
              Gaya penulisan
            </span>
            <Select
              value={tone}
              onValueChange={(v) => setTone(v as typeof tone)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="casual">Santai profesional</SelectItem>
                <SelectItem value="creative">Kreatif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium">
              Deskripsi pekerjaan (opsional)
            </span>
            <Textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste deskripsi pekerjaan untuk hasil yang lebih relevan..."
              className="min-h-[80px] resize-none text-xs"
            />
          </div>

          <Button
            className="w-full"
            onClick={generate}
            loading={mutation.isPending}
            loadingText="Membuat surat lamaran..."
          >
            Buat Surat Lamaran
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Hasil:</span>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  Salin
                </Button>
              </div>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="min-h-[200px] resize-none text-xs"
              />
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
