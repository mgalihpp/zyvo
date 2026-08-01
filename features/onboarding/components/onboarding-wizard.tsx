"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { PlanUpsellDialog } from "@/features/billing/components/premium-template-upsell-dialog";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
import {
  type OnboardingMethod,
  StepChooseMethod,
} from "@/features/onboarding/components/step-choose-method";
import { ONBOARDING_SKIP_COOKIE } from "@/features/onboarding/lib/constants";
import { trpc } from "@/lib/trpc/client";

const StepChooseTemplate = dynamic(
  () =>
    import("@/features/onboarding/components/step-choose-template").then(
      (m) => m.StepChooseTemplate,
    ),
  { loading: () => <TemplateGridSkeleton /> },
);
const StepImportCv = dynamic(
  () =>
    import("@/features/onboarding/components/step-import-cv").then(
      (m) => m.StepImportCv,
    ),
  { loading: () => <FormSkeleton /> },
);
const StepAiGenerator = dynamic(
  () =>
    import("@/features/onboarding/components/step-ai-generator").then(
      (m) => m.StepAiGenerator,
    ),
  { loading: () => <FormSkeleton /> },
);

function TemplateGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[1/1.414] w-full rounded-lg" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

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

export function OnboardingWizard({
  mode = "onboarding",
}: {
  mode?: "onboarding" | "create";
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const analytics = useCVAnalytics();
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<OnboardingMethod | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const upsell = usePlanUpsell();

  // Block creating another CV when the user is already at their plan's slot
  // limit (free = 1, basic = 3, pro = unlimited).
  const { data: cvs } = trpc.cv.list.useQuery();
  const { data: subscription } = trpc.billing.getSubscription.useQuery();
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const plan = subscription ? subscription.plan : "free";
  const cvLimit = plan === "free" ? 1 : plan === "basic" ? 3 : null;
  const slotBlocked =
    cvLimit !== null && cvs !== undefined && cvs.length >= cvLimit;

  useEffect(() => {
    if (slotBlocked) setSlotDialogOpen(true);
  }, [slotBlocked]);

  const generateMutation = trpc.ai.generate.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
  const importMutation = trpc.ai.importCv.useMutation({
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => {
      analytics.track("cv_created", { cv_id: cv.id });
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
          if (upsell.handleError(err)) {
            setTemplateId(null);
            return;
          }
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
      if (upsell.handleError(err)) return;
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
      if (upsell.handleError(err)) return;
      setImportError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.",
      );
    }
  }

  function handleExit() {
    if (mode === "create") {
      router.push("/dashboard");
      return;
    }
    document.cookie = `${ONBOARDING_SKIP_COOKIE}=1; path=/; max-age=31536000`;
    router.push("/dashboard");
  }

  const { title, subtitle } = getStepTitle(step, method);
  const busy = createMutation.isPending || importPhase !== "idle" || aiPending;

  if (slotBlocked) {
    return (
      <PlanUpsellDialog
        open={slotDialogOpen}
        onOpenChange={(open) => {
          setSlotDialogOpen(open);
          if (!open) router.push("/dashboard");
        }}
        description={`Batas ${cvLimit} CV untuk paketmu tercapai. Tingkatkan paket untuk membuat CV lagi.`}
      />
    );
  }

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
        ) : mode === "create" && !busy ? (
          <Button variant="ghost" size="sm" onClick={handleExit}>
            <ArrowLeft data-icon="inline-start" />
            Kembali
          </Button>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" onClick={handleExit} disabled={busy}>
          {mode === "create" ? "Batal" : "Lewati"}
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
      {upsell.dialog}
    </div>
  );
}
