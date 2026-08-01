"use client";

import { Check, FileText, FileUp, Info, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ExtractError,
  extractTextFromFile,
  MAX_IMPORT_CHARS,
} from "@/features/onboarding/lib/extract-text";
import { cn } from "@/lib/utils";

export type ImportPhase = "idle" | "reading" | "analyzing" | "creating";
type BusyImportPhase = Exclude<ImportPhase, "idle">;

const IMPORT_STAGES: ReadonlyArray<{
  id: BusyImportPhase;
  label: string;
}> = [
  { id: "reading", label: "Membaca file" },
  { id: "analyzing", label: "Menganalisis CV dengan AI" },
  { id: "creating", label: "Menyiapkan builder" },
];

export function getImportStageState(
  phase: BusyImportPhase,
  stage: BusyImportPhase,
): "complete" | "active" | "upcoming" {
  const phaseIndex = IMPORT_STAGES.findIndex((item) => item.id === phase);
  const stageIndex = IMPORT_STAGES.findIndex((item) => item.id === stage);
  if (stageIndex < phaseIndex) return "complete";
  if (stageIndex === phaseIndex) return "active";
  return "upcoming";
}

export function shouldWarnBeforeUnload(phase: ImportPhase) {
  return phase !== "idle";
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StepImportCv({
  onImport,
  phase,
  onPhaseChange,
  error,
  onClearError,
}: {
  /** Called with extracted/pasted text; parent runs AI + create. */
  onImport: (text: string) => void;
  phase: ImportPhase;
  onPhaseChange: (phase: ImportPhase) => void;
  error: string | null;
  onClearError: () => void;
}) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [pasted, setPasted] = useState("");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = phase !== "idle";

  useEffect(() => {
    if (phase === "idle" && error) setSelectedFile(null);
  }, [phase, error]);

  useEffect(() => {
    if (!shouldWarnBeforeUnload(phase)) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase]);

  async function handleFile(file: File) {
    setExtractError(null);
    onClearError();
    setSelectedFile({ name: file.name, size: file.size });
    onPhaseChange("reading");
    try {
      const text = await extractTextFromFile(file);
      onImport(text);
    } catch (err) {
      onPhaseChange("idle");
      setSelectedFile(null);
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

      {phase !== "idle" ? (
        <output
          className="block w-full rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
          aria-live="polite"
        >
          {selectedFile && (
            <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-background/80 p-3 text-left">
              <FileText
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          )}

          <div className={cn("space-y-1", selectedFile && "mt-5")}>
            {IMPORT_STAGES.map((stage) => {
              const state = getImportStageState(phase, stage.id);
              return (
                <div key={stage.id} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border",
                      state === "complete" &&
                        "border-primary bg-primary text-primary-foreground",
                      state === "active" &&
                        "border-primary bg-background text-primary",
                      state === "upcoming" &&
                        "border-muted-foreground/25 bg-background text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {state === "complete" ? (
                      <Check className="size-4" />
                    ) : state === "active" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      state === "upcoming" && "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Jangan tutup halaman ini. Proses AI dapat memakan waktu beberapa
              detik.
            </span>
          </p>
        </output>
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
