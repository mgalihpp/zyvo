"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { StepAiGenerator } from "@/features/onboarding/components/step-ai-generator";
import {
  type OnboardingMethod,
  StepChooseMethod,
} from "@/features/onboarding/components/step-choose-method";
import { StepChooseTemplate } from "@/features/onboarding/components/step-choose-template";
import { StepImportCv } from "@/features/onboarding/components/step-import-cv";
import { ONBOARDING_SKIP_COOKIE } from "@/features/onboarding/lib/constants";
import { trpc } from "@/lib/trpc/client";

type Step = 1 | 2 | 3;
type ImportPhase = "idle" | "reading" | "analyzing" | "creating";

function getStepTitle(
  step: Step,
  method: OnboardingMethod | null,
): { title: string; subtitle: string } {
  if (step === 1) {
    return {
      title: "Bagaimana kamu ingin membuat CV?",
      subtitle: "Pilih cara yang paling cocok untukmu.",
    };
  }
  if (step === 2) {
    return {
      title: "Pilih template",
      subtitle: "Semua template bisa diganti kapan saja di builder.",
    };
  }
  if (method === "ai") {
    return {
      title: "Ceritakan tentang kamu",
      subtitle: "AI akan menyusun draf CV lengkap dari info ini.",
    };
  }
  return {
    title: "Import CV kamu",
    subtitle: "AI akan mengisi semua bagian CV secara otomatis.",
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<OnboardingMethod | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateMutation = trpc.ai.generate.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
  const importMutation = trpc.ai.importCv.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      utils.cv.list.invalidate();
      router.push(`/builder/${cv.id}`);
    },
  });

  function handleSelectTemplate(id: string) {
    setTemplateId(id);
    if (method === "import" || method === "ai") {
      setStep(3);
      return;
    }
    // Manual: create empty CV immediately and go to builder.
    createMutation.mutate(
      { templateId: id },
      {
        onError: (err) => {
          toast.add({ title: err.message, type: "error" });
          setTemplateId(null);
        },
      },
    );
  }

  async function handleAiGenerate(input: {
    name: string;
    field: string;
    summary: string;
  }) {
    setAiError(null);
    setAiPending(true);
    try {
      const content = await generateMutation.mutateAsync(input);
      await createMutation.mutateAsync({
        ...content,
        templateId: templateId ?? "classic",
      });
      // Navigation happens in createMutation.onSuccess; keep the spinner up.
    } catch (err) {
      setAiPending(false);
      setAiError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }

  async function handleImport(text: string) {
    setImportError(null);
    try {
      setImportPhase("analyzing");
      const content = await importMutation.mutateAsync({ text });
      setImportPhase("creating");
      await createMutation.mutateAsync({
        ...content,
        templateId: templateId ?? "classic",
      });
      // Navigation happens in createMutation.onSuccess; keep the spinner up.
    } catch (err) {
      setImportPhase("idle");
      setImportError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }

  function handleSkip() {
    document.cookie = `${ONBOARDING_SKIP_COOKIE}=1; path=/; max-age=31536000`;
    router.push("/dashboard");
  }

  const { title, subtitle } = getStepTitle(step, method);
  const busy = createMutation.isPending || importPhase !== "idle" || aiPending;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-8">
      {/* Top bar: back + skip */}
      <div className="flex items-center justify-between">
        {step > 1 && !busy ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImportError(null);
              setStep((s) => (s === 3 ? 2 : 1) as Step);
            }}
          >
            <ArrowLeft data-icon="inline-start" />
            Kembali
          </Button>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy}>
          Lewati
        </Button>
      </div>

      {/* Step indicator */}
      <div className="mx-auto mt-6 flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <span
            key={s}
            className={
              s <= step
                ? "h-1.5 w-8 rounded-full bg-primary"
                : "h-1.5 w-8 rounded-full bg-muted"
            }
          />
        ))}
      </div>

      {/* Heading */}
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Step body */}
      <div className="mt-8 flex-1">
        {step === 1 && (
          <StepChooseMethod
            onSelect={(m) => {
              setMethod(m);
              setStep(2);
            }}
          />
        )}
        {step === 2 && <StepChooseTemplate onSelect={handleSelectTemplate} />}
        {step === 3 && method === "import" && (
          <StepImportCv
            onImport={handleImport}
            phase={importPhase}
            error={importError}
            onClearError={() => setImportError(null)}
          />
        )}
        {step === 3 && method === "ai" && (
          <StepAiGenerator
            onGenerate={handleAiGenerate}
            pending={aiPending}
            error={aiError}
          />
        )}
      </div>

      {/* Manual-path pending overlay text */}
      {step === 2 && createMutation.isPending && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Menyiapkan builder…
        </p>
      )}
    </div>
  );
}
