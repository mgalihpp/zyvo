"use client";

import type { JobApplication } from "@prisma/client";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  FileTextIcon,
  LightbulbIcon,
  MessageSquareIcon,
  PenLineIcon,
  SearchCheckIcon,
  SparklesIcon,
  TriangleAlertIcon,
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
import { AiUsageIndicator } from "@/features/ai/components/ai-usage-indicator";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import { useCvSnapshot } from "@/features/job-tracker/hooks/use-cv-snapshot";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface JdResult {
  score: number;
  matchedKeywords: string[];
  gaps: string[];
  recommendations: string[];
}

const TONES = [
  {
    value: "formal",
    label: "Formal",
    description: "Bahasa formal dan profesional",
    icon: PenLineIcon,
  },
  {
    value: "casual",
    label: "Santai profesional",
    description: "Tetap profesional, lebih ringan",
    icon: SparklesIcon,
  },
  {
    value: "creative",
    label: "Kreatif",
    description: "Menarik dan beda dari yang lain",
    icon: LightbulbIcon,
  },
] as const;

/** Picker built on DropdownMenu (same pattern as ApplicationDialog). */
function ContextPicker({
  label,
  value,
  onChange,
  placeholder,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  icon: typeof BriefcaseIcon;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-10 w-full justify-between font-normal",
                !selected && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon
              className="size-4 shrink-0 text-violet-500"
              aria-hidden="true"
            />
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
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

/** Shared context: application + CV pickers, JD chip, manual JD textarea. */
function ContextFields({
  applications,
  cvs,
  appId,
  setAppId,
  cvId,
  setCvId,
  jdText,
  manualJd,
  setManualJd,
  hasStoredJd,
}: {
  applications: JobApplication[];
  cvs: { id: string; title: string }[] | undefined;
  appId: string;
  setAppId: (v: string) => void;
  cvId: string;
  setCvId: (v: string) => void;
  jdText: string;
  manualJd: string;
  setManualJd: (v: string) => void;
  hasStoredJd: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <ContextPicker
          label="Lamaran untuk posisi"
          value={appId}
          onChange={setAppId}
          placeholder="Pilih lamaran"
          icon={BriefcaseIcon}
          options={applications.map((a) => ({
            value: a.id,
            label: `${a.company} — ${a.position}`,
          }))}
        />
        <ContextPicker
          label="Pilih CV"
          value={cvId}
          onChange={setCvId}
          placeholder="Pilih CV"
          icon={FileTextIcon}
          options={cvs?.map((cv) => ({ value: cv.id, label: cv.title })) ?? []}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
            jdText
              ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
              : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
          )}
        >
          {jdText ? (
            <CheckCircle2Icon className="size-3.5" aria-hidden="true" />
          ) : (
            <TriangleAlertIcon className="size-3.5" aria-hidden="true" />
          )}
          {jdText
            ? "Deskripsi lowongan tersedia"
            : "Belum ada deskripsi lowongan"}
        </span>
        {!cvId && (
          <span className="text-xs text-muted-foreground">
            Pilih CV untuk mulai.
          </span>
        )}
      </div>
      {!hasStoredJd && (
        <div className="rounded-xl border border-dashed border-violet-300/60 bg-violet-500/[0.03] p-4 dark:border-violet-500/30">
          <span className="mb-1 block text-xs font-medium">
            Deskripsi lowongan <span className="text-destructive">*</span>
          </span>
          <Textarea
            value={manualJd}
            onChange={(e) => setManualJd(e.target.value.slice(0, 3000))}
            placeholder={
              "Paste deskripsi lowongan atau persyaratan pekerjaan di sini...\nSemakin lengkap, semakin akurat hasilnya."
            }
            className="min-h-[90px] resize-none border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {manualJd.length} / 3000
          </p>
        </div>
      )}
    </div>
  );
}

function TabHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="text-xs/relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

const sidebarTabClass =
  "rounded-lg px-3 py-2.5 text-[13px] after:hidden data-active:bg-violet-500/10 data-active:text-violet-700 dark:data-active:bg-violet-500/15 dark:data-active:text-violet-300";

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

  const utils = trpc.useUtils();
  const invalidateQuota = () => utils.ai.quotaStatus.invalidate();
  const upsell = usePlanUpsell();
  const coverLetterMutation = trpc.ai.coverLetter.useMutation({
    onError: upsell.handleError,
    onSuccess: ({ result }) => setCoverLetter(result),
    onSettled: invalidateQuota,
  });
  const interviewMutation = trpc.ai.interviewPrep.useMutation({
    onError: upsell.handleError,
    onSuccess: (data) => setQuestions(data.questions),
    onSettled: invalidateQuota,
  });
  const analyzeMutation = trpc.ai.analyzeJD.useMutation({
    onError: upsell.handleError,
    onSuccess: (data) => setAnalysis(data),
    onSettled: invalidateQuota,
  });

  const ready = Boolean(snapshot) && !cvLoading && Boolean(jdText.trim());

  const scoreColor = !analysis
    ? ""
    : analysis.score >= 75
      ? "text-green-600"
      : analysis.score >= 50
        ? "text-yellow-600"
        : "text-red-600";

  const contextFields = (
    <ContextFields
      applications={applications}
      cvs={cvs}
      appId={appId}
      setAppId={setAppId}
      cvId={cvId}
      setCvId={setCvId}
      jdText={jdText}
      manualJd={manualJd}
      setManualJd={setManualJd}
      hasStoredJd={Boolean(selectedApp?.jobDescription)}
    />
  );

  const ctaClass =
    "h-11 w-full bg-gradient-to-r from-violet-600 to-violet-500 text-sm text-white hover:from-violet-700 hover:to-violet-600";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} modal="trap-focus">
        <DialogContent className="p-0 sm:max-w-6xl" scrollable>
          <Tabs
            defaultValue="cover-letter"
            orientation="vertical"
            className="min-h-[620px] gap-0 overflow-hidden rounded-xl"
          >
            {/* Sidebar */}
            <div className="flex w-60 shrink-0 flex-col border-r bg-muted/30 p-4">
              <DialogHeader className="mb-6 px-1 pt-1">
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <SparklesIcon className="size-4.5 text-violet-500" />
                  Asisten AI Lamaran
                  <AiUsageIndicator align="start" side="right" />
                </DialogTitle>
              </DialogHeader>
              <TabsList variant="line" className="w-full gap-1 p-0">
                <TabsTrigger value="cover-letter" className={sidebarTabClass}>
                  <FileTextIcon aria-hidden="true" />
                  Surat Lamaran
                </TabsTrigger>
                <TabsTrigger value="interview" className={sidebarTabClass}>
                  <MessageSquareIcon aria-hidden="true" />
                  Interview Prep
                </TabsTrigger>
                <TabsTrigger value="analysis" className={sidebarTabClass}>
                  <SearchCheckIcon aria-hidden="true" />
                  Analisis Lowongan
                </TabsTrigger>
              </TabsList>
              <div className="mt-auto rounded-xl bg-violet-500/5 p-3.5 dark:bg-violet-500/10">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <SparklesIcon className="size-3.5 text-violet-500" />
                  Tips
                </p>
                <p className="text-xs/relaxed text-muted-foreground">
                  AI akan menyesuaikan hasil berdasarkan lamaran, CV, dan
                  deskripsi lowongan yang kamu pilih.
                </p>
              </div>
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1 bg-violet-500/[0.02] p-6 sm:p-8">
              {/* Surat Lamaran */}
              <TabsContent value="cover-letter" className="space-y-5">
                <TabHeading
                  title="Buat Surat Lamaran"
                  description="Isi informasi di bawah ini untuk membuat surat lamaran yang profesional dan sesuai kebutuhanmu."
                />
                {contextFields}
                <div>
                  <span className="mb-1.5 block text-xs font-medium">
                    Gaya penulisan
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {TONES.map(({ value, label, description, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTone(value)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                          tone === value
                            ? "border-violet-400 bg-violet-500/10 dark:border-violet-500/60"
                            : "bg-background hover:border-violet-300 hover:bg-violet-500/5",
                        )}
                      >
                        <Icon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            tone === value
                              ? "text-violet-600 dark:text-violet-400"
                              : "text-muted-foreground",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block text-xs font-semibold",
                              tone === value &&
                                "text-violet-700 dark:text-violet-300",
                            )}
                          >
                            {label}
                          </span>
                          <span className="block text-[11px]/relaxed text-muted-foreground">
                            {description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className={ctaClass}
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
                  <SparklesIcon aria-hidden="true" />
                  Buat Surat Lamaran
                </Button>
                {coverLetter && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Hasil:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigator.clipboard.writeText(coverLetter)
                        }
                      >
                        Salin
                      </Button>
                    </div>
                    <Textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="min-h-[240px] resize-none bg-background text-xs"
                    />
                  </div>
                )}
                {coverLetterMutation.error &&
                  coverLetterMutation.error.data?.code !== "FORBIDDEN" && (
                    <p className="text-xs text-destructive">
                      {coverLetterMutation.error.message}
                    </p>
                  )}
              </TabsContent>

              {/* Interview Prep */}
              <TabsContent value="interview" className="space-y-5">
                <TabHeading
                  title="Persiapan Interview"
                  description="Generate pertanyaan interview yang mungkin muncul berdasarkan CV dan lowongan yang kamu pilih."
                />
                {contextFields}
                <Button
                  className={ctaClass}
                  disabled={!ready}
                  onClick={() =>
                    snapshot &&
                    interviewMutation.mutate({ cvSnapshot: snapshot, jdText })
                  }
                  loading={interviewMutation.isPending}
                  loadingText="Membuat pertanyaan..."
                >
                  <SparklesIcon aria-hidden="true" />
                  Generate 10 Pertanyaan Interview
                </Button>
                {questions.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {questions.map((q, i) => (
                      <div
                        key={q.question}
                        className="space-y-1.5 rounded-xl border bg-background p-3.5"
                      >
                        <p className="text-sm font-medium">
                          {i + 1}. {q.question}
                        </p>
                        <p className="text-xs/relaxed text-muted-foreground">
                          💡 {q.tip}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {interviewMutation.error &&
                  interviewMutation.error.data?.code !== "FORBIDDEN" && (
                    <p className="text-xs text-destructive">
                      {interviewMutation.error.message}
                    </p>
                  )}
              </TabsContent>

              {/* Analisis Lowongan */}
              <TabsContent value="analysis" className="space-y-5">
                <TabHeading
                  title="Analisis Lowongan"
                  description="Bandingkan CV-mu dengan deskripsi lowongan untuk melihat skor kecocokan dan gap yang perlu diisi."
                />
                {contextFields}
                <Button
                  className={ctaClass}
                  disabled={!ready}
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
                  <SparklesIcon aria-hidden="true" />
                  Analisis Kesesuaian
                </Button>
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
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5">
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
                {analyzeMutation.error &&
                  analyzeMutation.error.data?.code !== "FORBIDDEN" && (
                    <p className="text-xs text-destructive">
                      {analyzeMutation.error.message}
                    </p>
                  )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
      {upsell.dialog}
    </>
  );
}
