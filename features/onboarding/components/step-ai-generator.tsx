"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiUsageIndicator } from "@/features/ai/components/ai-usage-indicator";

export function StepAiGenerator({
  onGenerate,
  pending,
  error,
}: {
  /** Called with the 3 form fields; parent runs AI generate + create. */
  onGenerate: (input: { name: string; field: string; summary: string }) => void;
  pending: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [field, setField] = useState("");
  const [summary, setSummary] = useState("");

  const canSubmit = name.trim().length > 0 && field.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor="gen-name">
          Nama lengkap <span className="text-destructive">*</span>
        </label>
        <Input
          id="gen-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Budi Santoso"
          disabled={pending}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor="gen-field">
          Bidang / posisi yang dilamar{" "}
          <span className="text-destructive">*</span>
        </label>
        <Input
          id="gen-field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          placeholder="Software Engineer, Marketing Manager, ..."
          disabled={pending}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium" htmlFor="gen-summary">
          Ringkasan pengalaman (opsional)
        </label>
        <Textarea
          id="gen-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="3 tahun pengalaman di startup fintech sebagai backend developer, pernah handle sistem pembayaran..."
          className="min-h-[120px] resize-none text-xs"
          disabled={pending}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button
          className="flex-1"
          onClick={() => onGenerate({ name, field, summary })}
          loading={pending}
          loadingText="Membuat CV…"
          disabled={!canSubmit}
        >
          Buat dengan AI
        </Button>
        <AiUsageIndicator align="end" side="top" />
      </div>
    </div>
  );
}
