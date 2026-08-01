"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanUpsell } from "@/features/billing/hooks/use-plan-upsell";
import { trpc } from "@/lib/trpc/client";

const StepChooseTemplate = dynamic(
  () =>
    import("@/features/onboarding/components/step-choose-template").then(
      (m) => m.StepChooseTemplate,
    ),
  { loading: () => <TemplateGridSkeleton /> },
);

const StepAiGenerator = dynamic(
  () =>
    import("@/features/onboarding/components/step-ai-generator").then(
      (m) => m.StepAiGenerator,
    ),
  { loading: () => <AiFormSkeleton /> },
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

function AiFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-[120px] w-full rounded-md" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

/** Full-page AI CV generator — reached from `/dashboard/ai`. */
export function AiGeneratorPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const upsell = usePlanUpsell();
  const generateMutation = trpc.ai.generate.useMutation({
    onError: upsell.handleError,
    onSettled: () => utils.ai.quotaStatus.invalidate(),
  });
  const createMutation = trpc.cv.create.useMutation({
    onError: upsell.handleError,
    onSuccess: (cv) => router.push(`/builder/${cv.id}`),
  });

  async function handleGenerate(input: {
    name: string;
    field: string;
    summary: string;
  }) {
    const content = await generateMutation.mutateAsync(input);
    await createMutation.mutateAsync({
      ...content,
      templateId: templateId ?? "classic",
    });
  }

  const pending = generateMutation.isPending || createMutation.isPending;
  const error = generateMutation.error ?? createMutation.error;
  const step = templateId ? 2 : 1;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 py-8">
      {/* Top bar: back only */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (templateId ? setTemplateId(null) : router.back())}
        >
          <ArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </div>

      {/* Step indicator */}
      <div className="mx-auto mt-6 flex items-center gap-2">
        {[1, 2].map((s) => (
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
        <h1 className="text-2xl font-bold sm:text-3xl">
          {templateId ? "Ceritakan tentang kamu" : "Pilih template"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {templateId
            ? "AI akan menyusun draf CV lengkap dari info ini."
            : "Semua template bisa diganti kapan saja di builder."}
        </p>
      </div>

      {/* Step body */}
      <div className="mt-8 flex-1">
        {templateId ? (
          <StepAiGenerator
            onGenerate={handleGenerate}
            pending={pending}
            error={
              error && error.data?.code !== "FORBIDDEN" ? error.message : null
            }
          />
        ) : (
          <StepChooseTemplate onSelect={setTemplateId} />
        )}
      </div>
      {upsell.dialog}
    </div>
  );
}
