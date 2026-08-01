"use client";

import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ExtractError,
  extractTextFromFile,
  MAX_IMPORT_CHARS,
} from "@/features/onboarding/lib/extract-text";
import { cn } from "@/lib/utils";

type ImportPhase = "idle" | "reading" | "analyzing" | "creating";

const PHASE_LABEL: Record<Exclude<ImportPhase, "idle">, string> = {
  reading: "Membaca file…",
  analyzing: "Menganalisis CV dengan AI…",
  creating: "Menyiapkan builder…",
};

export function StepImportCv({
  onImport,
  phase,
  error,
  onClearError,
}: {
  /** Called with extracted/pasted text; parent runs AI + create. */
  onImport: (text: string) => void;
  phase: ImportPhase;
  error: string | null;
  onClearError: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [pasted, setPasted] = useState("");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase !== "idle";

  async function handleFile(file: File) {
    setExtractError(null);
    onClearError();
    try {
      const text = await extractTextFromFile(file);
      onImport(text);
    } catch (err) {
      if (err instanceof ExtractError) {
        setExtractError(err.message);
        // Scanned PDFs land here — nudge toward the paste tab.
        if (err.message.includes("paste")) setTab("paste");
      } else {
        setExtractError(
          "Gagal membaca file. Coba lagi atau paste teks CV kamu.",
        );
      }
    }
  }

  const shownError = extractError ?? error;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {/* Tab switcher */}
      <div className="flex justify-center gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { id: "upload", label: "Upload file" },
            { id: "paste", label: "Paste teks" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={busy}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {busy ? (
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-10">
          <div className="text-center">
            <p className="text-sm font-medium">{PHASE_LABEL[phase]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {phase === "creating"
                ? "Pindah ke builder…"
                : "Ini bisa memakan waktu beberapa detik."}
            </p>
          </div>
          <div className="mx-auto mt-6 max-w-sm space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ) : tab === "upload" ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileUp className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">
              Klik untuk pilih file atau drag & drop
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF atau DOCX, maks. 5MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </button>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={pasted}
            onChange={(e) =>
              setPasted(e.target.value.slice(0, MAX_IMPORT_CHARS))
            }
            placeholder="Paste seluruh isi CV kamu di sini…"
            className="min-h-[220px] text-xs"
          />
          <Button
            className="w-full"
            disabled={pasted.trim().length < 50}
            onClick={() => {
              setExtractError(null);
              onClearError();
              onImport(pasted.trim());
            }}
          >
            Import dari teks
          </Button>
        </div>
      )}

      {shownError && !busy && (
        <p className="text-center text-sm text-destructive">{shownError}</p>
      )}
    </div>
  );
}
