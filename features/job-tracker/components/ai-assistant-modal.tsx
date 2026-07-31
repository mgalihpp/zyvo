"use client";

import type { JobApplication } from "@prisma/client";
import {
  ChevronDownIcon,
  FileTextIcon,
  MessageSquareIcon,
  SearchCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCvSnapshot } from "@/features/job-tracker/hooks/use-cv-snapshot";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface JdResult {
  score: number;
  matchedKeywords: string[];
  gaps: string[];
  recommendations: string[];
}

/** Picker built on DropdownMenu (same pattern as ApplicationDialog). */
function ContextPicker({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-between font-normal",
                !selected && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDownIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AiAssistantModal({
  open,
  onOpenChange,
  applications,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: JobApplication[];
}) {
  const { data: cvs } = trpc.cv.list.useQuery(undefined, { enabled: open });

  const [appId, setAppId] = useState("");
  const [cvId, setCvId] = useState("");
  const [manualJd, setManualJd] = useState("");

  const selectedApp = applications.find((a) => a.id === appId);
  const jdText = selectedApp?.jobDescription || manualJd;

  // Default selections when the modal opens.
  useEffect(() => {
    if (!open) return;
    setAppId((prev) => prev || (applications[0]?.id ?? ""));
  }, [open, applications]);
  useEffect(() => {
    if (!open) return;
    setCvId(selectedApp?.cvId || cvs?.[0]?.id || "");
  }, [open, selectedApp?.cvId, cvs]);

  const { snapshot, isLoading: cvLoading } = useCvSnapshot(
    open ? cvId || undefined : undefined,
  );

  // Per-tab results, reset when context changes.
  const [tone, setTone] = useState<"formal" | "casual" | "creative">("formal");
  const [coverLetter, setCoverLetter] = useState("");
  const [questions, setQuestions] = useState<
    { question: string; tip: string }[]
  >([]);
  const [analysis, setAnalysis] = useState<JdResult | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on context change only
  useEffect(() => {
    setCoverLetter("");
    setQuestions([]);
    setAnalysis(null);
    setManualJd("");
  }, [appId, cvId]);

  const coverLetterMutation = trpc.ai.coverLetter.useMutation({
    onSuccess: ({ result }) => setCoverLetter(result),
  });
  const interviewMutation = trpc.ai.interviewPrep.useMutation({
    onSuccess: (data) => setQuestions(data.questions),
  });
  const analyzeMutation = trpc.ai.analyzeJD.useMutation({
    onSuccess: (data) => setAnalysis(data),
  });

  const ready = Boolean(snapshot) && !cvLoading;

  const scoreColor = !analysis
    ? ""
    : analysis.score >= 75
      ? "text-green-600"
      : analysis.score >= 50
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" scrollable>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-violet-500" />
            Asisten AI Lamaran
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context header */}
          <div className="space-y-3 rounded-xl border bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <ContextPicker
                label="Lamaran"
                value={appId}
                onChange={setAppId}
                placeholder="Pilih lamaran"
                options={applications.map((a) => ({
                  value: a.id,
                  label: `${a.company} — ${a.position}`,
                }))}
              />
              <ContextPicker
                label="CV"
                value={cvId}
                onChange={setCvId}
                placeholder="Pilih CV"
                options={
                  cvs?.map((cv) => ({ value: cv.id, label: cv.title })) ?? []
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  jdText
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {jdText ? "JD: tersedia" : "JD: tidak ada"}
              </span>
              {!cvId && (
                <span className="text-xs text-muted-foreground">
                  Pilih CV untuk mulai.
                </span>
              )}
            </div>
            {!selectedApp?.jobDescription && (
              <Textarea
                value={manualJd}
                onChange={(e) => setManualJd(e.target.value.slice(0, 3000))}
                placeholder="Lamaran ini belum punya deskripsi lowongan — paste di sini (tidak disimpan)..."
                className="min-h-[70px] resize-none text-xs"
              />
            )}
          </div>

          <Tabs defaultValue="cover-letter" orientation="vertical">
            <TabsList className="w-44 shrink-0 self-start">
              <TabsTrigger value="cover-letter">
                <FileTextIcon aria-hidden="true" />
                Surat Lamaran
              </TabsTrigger>
              <TabsTrigger value="interview">
                <MessageSquareIcon aria-hidden="true" />
                Interview Prep
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <SearchCheckIcon aria-hidden="true" />
                Analisis Lowongan
              </TabsTrigger>
            </TabsList>

            {/* Surat Lamaran */}
            <TabsContent value="cover-letter" className="space-y-4">
              <div>
                <span className="mb-1 block text-xs font-medium">
                  Gaya penulisan
                </span>
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {(
                    [
                      ["formal", "Formal"],
                      ["casual", "Santai profesional"],
                      ["creative", "Kreatif"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={tone === value ? "default" : "ghost"}
                      className="flex-1"
                      onClick={() => setTone(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!ready}
                onClick={() =>
                  snapshot &&
                  coverLetterMutation.mutate({
                    cvSnapshot: snapshot,
                    jdText,
                    tone,
                  })
                }
                loading={coverLetterMutation.isPending}
                loadingText="Membuat surat lamaran..."
              >
                Buat Surat Lamaran
              </Button>
              {coverLetter && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Hasil:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(coverLetter)}
                    >
                      Salin
                    </Button>
                  </div>
                  <Textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="min-h-[240px] resize-none text-xs"
                  />
                </div>
              )}
              {coverLetterMutation.error && (
                <p className="text-xs text-destructive">
                  {coverLetterMutation.error.message}
                </p>
              )}
            </TabsContent>

            {/* Interview Prep */}
            <TabsContent value="interview" className="space-y-4">
              <Button
                className="w-full"
                disabled={!ready}
                onClick={() =>
                  snapshot &&
                  interviewMutation.mutate({ cvSnapshot: snapshot, jdText })
                }
                loading={interviewMutation.isPending}
                loadingText="Membuat pertanyaan..."
              >
                Generate 10 Pertanyaan Interview
              </Button>
              {questions.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {questions.map((q, i) => (
                    <div
                      key={q.question}
                      className="space-y-1.5 rounded-lg border p-3"
                    >
                      <p className="text-sm font-medium">
                        {i + 1}. {q.question}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        💡 {q.tip}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {interviewMutation.error && (
                <p className="text-xs text-destructive">
                  {interviewMutation.error.message}
                </p>
              )}
            </TabsContent>

            {/* Analisis Lowongan */}
            <TabsContent value="analysis" className="space-y-4">
              <Button
                className="w-full"
                disabled={!ready || !jdText.trim()}
                onClick={() =>
                  snapshot &&
                  analyzeMutation.mutate({
                    jdText: jdText.slice(0, 3000),
                    cvSnapshot: snapshot,
                  })
                }
                loading={analyzeMutation.isPending}
                loadingText="Menganalisis..."
              >
                Analisis Kesesuaian
              </Button>
              {!jdText.trim() && (
                <p className="text-xs text-muted-foreground">
                  Butuh deskripsi lowongan — isi di form lamaran atau paste di
                  atas.
                </p>
              )}
              {analysis && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Skor kesesuaian:
                    </span>
                    <span className={`text-3xl font-bold ${scoreColor}`}>
                      {analysis.score}%
                    </span>
                  </div>
                  {analysis.matchedKeywords.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-green-700">
                        Keyword yang cocok:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.matchedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.gaps.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-amber-700">
                        Gap yang perlu diisi:
                      </p>
                      <ul className="space-y-0.5">
                        {analysis.gaps.map((gap) => (
                          <li
                            key={gap}
                            className="text-xs text-muted-foreground"
                          >
                            • {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.recommendations.length > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="mb-1 text-xs font-medium">Rekomendasi:</p>
                      <ul className="space-y-1">
                        {analysis.recommendations.map((rec) => (
                          <li
                            key={rec}
                            className="text-xs text-muted-foreground"
                          >
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {analyzeMutation.error && (
                <p className="text-xs text-destructive">
                  {analyzeMutation.error.message}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
