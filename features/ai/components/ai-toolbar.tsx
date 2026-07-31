"use client";

import {
  BriefcaseIcon,
  PenLineIcon,
  ShrinkIcon,
  SparklesIcon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiImprove } from "@/features/ai/hooks/use-ai-stream";

interface AiToolbarProps {
  fieldType: string;
  value: string;
  onChange: (v: string) => void;
}

/** Inline AI action toolbar wired to the ai.improve tRPC procedure. */
export function AiToolbar({ fieldType, value, onChange }: AiToolbarProps) {
  const { improve, undo, canUndo, isPending, error } = useAiImprove(fieldType);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Urungkan"
          disabled={!canUndo || isPending}
          onClick={() => undo(onChange)}
        >
          <Undo2Icon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || !value.trim()}
          onClick={() => improve(value, "formalize", onChange)}
        >
          <BriefcaseIcon data-icon="inline-start" />
          Formalkan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || !value.trim()}
          onClick={() => improve(value, "shorten", onChange)}
        >
          <ShrinkIcon data-icon="inline-start" />
          Persingkat
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || !value.trim()}
          onClick={() => improve(value, "improve", onChange)}
        >
          <SparklesIcon data-icon="inline-start" />
          Perbaiki kalimat
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || !value.trim()}
          onClick={() => improve(value, "expand", onChange)}
        >
          <PenLineIcon data-icon="inline-start" />
          Kembangkan
        </Button>
      </div>
      {isPending && (
        <p className="text-xs text-muted-foreground">AI sedang memproses...</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
