"use client";

import { ChevronDownIcon, InfoIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/** Collapsible "Tips Lolos Seleksi CV" banner shown at the top of each editor. */
export function TipsBanner({ children }: { children?: React.ReactNode }) {
  return (
    <Collapsible
      defaultOpen={false}
      className="rounded-lg border border-primary/20 bg-primary/5"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        <InfoIcon className="size-4 shrink-0 text-primary" />
        Tips Lolos Seleksi CV
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 text-xs/relaxed text-muted-foreground">
        {children ?? (
          <ul className="ml-4 list-disc space-y-1 pt-1">
            <li>
              Gunakan kata kerja yang kuat untuk menggambarkan pengalaman Anda
            </li>
            <li>
              Fokus pada pengalaman yang paling relevan untuk pekerjaan yang
              Anda lamar
            </li>
            <li>
              Gunakan contoh yang spesifik dan konkret untuk mengilustrasikan
              poin Anda
            </li>
            <li>Gunakan bahasa positif untuk menonjolkan kelebihan Anda</li>
            <li>
              Hindari menggunakan jargon atau akronim yang mungkin tidak dikenal
              oleh pembaca
            </li>
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Static (non-collapsible) info banner, e.g. the skill dialog's help note. */
export function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs/relaxed text-muted-foreground">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  );
}

// AiToolbar has been superseded by the live version in
// features/ai/components/ai-toolbar.tsx (wired to trpc.ai.improve).
