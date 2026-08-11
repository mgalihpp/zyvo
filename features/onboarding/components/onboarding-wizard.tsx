"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  PlanUpsellDialog,
  PremiumTemplateUpsellDialog,
} from "@/features/billing/components/premium-template-upsell-dialog";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import {
  TEMPLATES,
  type TemplateMeta,
} from "@/features/cv/components/templates";
import { useCVAnalytics } from "@/features/cv/hooks/use-cv-analytics";
import {
  type OnboardingMethod,
  StepChooseMethod,
} from "@/features/onboarding/components/step-choose-method";
import type { ImportPhase } from "@/features/onboarding/components/step-import-cv";
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
    subtitle:
      "Upload CV lama kamu dengan format (PDF/DOCX) atau paste teksnya.",
  };
}

/** Minimal read-only query-param reader (avoids importing the next type). */
type ParamReader = { get: (key: string) => string | null };

function readStep(params: ParamReader): Step {
  const n = Number(params.get("step"));
  const m = params.get("method");
  // Step 3 is only meaningful with an import/ai method; fall back otherwise.
  if (n === 3 && (m === "import" || m === "ai")) return 3;
  return n === 2 ? 2 : 1;
}

function readMethod(params: ParamReader): OnboardingMethod | null {
  const m = params.get("method");
  return m === "manual" || m === "import" || m === "ai" ? m : null;
}

function readTemplate(params: ParamReader): string | null {
  return params.get("template");
}

function OnboardingWizardInner({
  mode = "onboarding",
}: {
  mode?: "onboarding" | "create";
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const analytics = useCVAnalytics();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>(() => readStep(searchParams));
  const [method, setMethod] = useState<OnboardingMethod | null>(() =>
    readMethod(searchParams),
  );
  const [templateId, setTemplateId] = useState<string | null>(() =>
    readTemplate(searchParams),
  );
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const upsell = usePlanUpsell();
  const [upsellTemplate, setUpsellTemplate] = useState<TemplateMeta | null>(
    null,
  );

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

  // Mirror wizard state into the URL so refresh / deep-link / back-button
  // restore the exact step instead of resetting to the start.
  useEffect(() => {
    const params = new URLSearchParams();
    if (step > 1) params.set("step", String(step));
    if (method) params.set("method", method);
    if (templateId) params.set("template", templateId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [step, method, templateId, pathname, router]);

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
    // Free plan (subscription loaded as null) can't pick a premium template —
    // show the billing upsell up front instead of failing later at cv.create.
    const template = TEMPLATES.find((t) => t.id === id);
    if (template?.premium && subscription === null) {
      setUpsellTemplate(template);
      return;
    }
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
    // biome-ignore lint/suspicious/noDocumentCookie: one-off skip flag, not an auth/session cookie
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
            onPhaseChange={setImportPhase}
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
      <PremiumTemplateUpsellDialog
        open={!!upsellTemplate}
        onOpenChange={(open) => {
          if (!open) setUpsellTemplate(null);
        }}
        templateName={upsellTemplate?.name}
      />
    </div>
  );
}

function WizardFallback() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center justify-center px-4 py-8">
      <Skeleton className="h-6 w-48 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-64 rounded-md" />
      <div className="mt-8 w-full max-w-xl space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * useSearchParams suspends during prerendering, so the hook-using body must sit
 * behind a Suspense boundary or static builds fail. Consumers just render
 * <OnboardingWizard/> — the boundary lives here.
 */
export function OnboardingWizard(props: { mode?: "onboarding" | "create" }) {
  return (
    <Suspense fallback={<WizardFallback />}>
      <OnboardingWizardInner {...props} />
    </Suspense>
  );
}
