"use client";

import {
  BriefcaseIcon,
  PenLineIcon,
  ShrinkIcon,
  SparklesIcon,
  Undo2Icon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type ImproveAction,
  useAiImprove,
} from "@/features/ai/hooks/use-ai-stream";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import { AiUsageIndicator } from "./ai-usage-indicator";

interface AiToolbarProps {
  fieldType: string;
  value: string;
  onChange: (v: string) => void;
}

const ACTIONS: {
  action: ImproveAction;
  label: string;
  loadingText: string;
  Icon: typeof SparklesIcon;
}[] = [
  {
    action: "formalize",
    label: "Formalkan",
    loadingText: "Memformalkan...",
    Icon: BriefcaseIcon,
  },
  {
    action: "shorten",
    label: "Persingkat",
    loadingText: "Mempersingkat...",
    Icon: ShrinkIcon,
  },
  {
    action: "improve",
    label: "Perbaiki kalimat",
    loadingText: "Memperbaiki...",
    Icon: SparklesIcon,
  },
  {
    action: "expand",
    label: "Kembangkan",
    loadingText: "Mengembangkan...",
    Icon: PenLineIcon,
  },
];

/** Inline AI action toolbar wired to the ai.improve tRPC procedure. */
export function AiToolbar({ fieldType, value, onChange }: AiToolbarProps) {
  const upsell = usePlanUpsell();
  const { improve, undo, canUndo, isPending, error, forbidden } = useAiImprove(
    fieldType,
    upsell.handleError,
  );
  const [pendingAction, setPendingAction] = useState<ImproveAction | null>(
    null,
  );

  async function run(action: ImproveAction) {
    setPendingAction(action);
    try {
      await improve(value, action, onChange);
    } finally {
      setPendingAction(null);
    }
  }

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
        {ACTIONS.map(({ action, label, loadingText, Icon }) => (
          <Button
            key={action}
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || !value.trim()}
            loading={isPending && pendingAction === action}
            loadingText={loadingText}
            onClick={() => run(action)}
          >
            <Icon data-icon="inline-start" />
            {label}
          </Button>
        ))}
        <AiUsageIndicator />
      </div>
      {error && !forbidden && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      {upsell.dialog}
    </div>
  );
}
