"use client";

import { FileTextIcon, MessageSquareIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AiCoverLetterModal } from "@/features/ai/components/ai-cover-letter-modal";
import { AiInterviewModal } from "@/features/ai/components/ai-interview-modal";
import { CvPreview } from "@/features/cv/components/cv-preview";
import { useCVAnalyticsTracking } from "@/features/cv/hooks/use-cv-analytics-tracking";
import { useCvAutosave } from "@/features/cv/hooks/use-cv-autosave";
import { usePanelUrl } from "@/features/cv/hooks/use-panel-url";
import type { CvContent } from "@/features/cv/schemas/cv";
import type { BuilderPanel } from "@/features/cv/stores/cv-store";
import { CvStoreProvider } from "@/features/cv/stores/cv-store-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { BuilderSidebar } from "./builder-sidebar";
import { PanelContent } from "./panels";
import type { BuilderUser } from "./panels/panel-topbar";
import { SaveIndicator } from "./save-indicator";

// The editor dialog pulls in the calendar, slider, and every per-section form.
// Load it lazily so its cost is paid only when the user opens an editor.
const EditorDialog = lazy(() =>
  import("./panels/editor-dialog").then((m) => ({ default: m.EditorDialog })),
);

export function BuilderClient({
  cvId,
  initialContent,
  initialPanel,
  initialUser,
}: {
  cvId: string;
  initialContent: CvContent;
  initialPanel?: BuilderPanel;
  initialUser: BuilderUser;
}) {
  // Per-request store seeded with SSR data so the first paint already has the
  // real CV. The page keys this component by cvId, so switching CVs remounts.
  return (
    <CvStoreProvider
      init={{ cvId, content: initialContent, activePanel: initialPanel }}
    >
      <BuilderLayout initialUser={initialUser} />
    </CvStoreProvider>
  );
}

function BuilderLayout({ initialUser }: { initialUser: BuilderUser }) {
  useCvAutosave();
  usePanelUrl();
  useCVAnalyticsTracking();

  const isMobile = useIsMobile();
  // `useIsMobile` reports false during SSR and the first client render, so we
  // can't tell "desktop" from "not measured yet". Until mounted, render a
  // CSS-responsive neutral shell (editor + preview via `md:` classes) that
  // looks right on every viewport — this avoids the mobile flash of the
  // desktop resizable split before hydration corrects it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);

  const editor = <PanelContent initialUser={initialUser} />;
  const preview = <CvPreview />;

  return (
    <div className="flex h-screen flex-col">
      <div className="absolute right-4 top-3 z-10 flex items-center gap-3">
        <SaveIndicator />
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCoverLetterOpen(true)}
        >
          <FileTextIcon />
          <span className="hidden sm:inline">Surat Lamaran</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setInterviewOpen(true)}
        >
          <MessageSquareIcon />
          <span className="hidden sm:inline">Interview Prep</span>
        </Button>
        {mounted && isMobile ? (
          <div className="flex rounded-md border bg-background p-0.5">
            <Button
              size="sm"
              variant={mobileTab === "edit" ? "secondary" : "ghost"}
              onClick={() => setMobileTab("edit")}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant={mobileTab === "preview" ? "secondary" : "ghost"}
              onClick={() => setMobileTab("preview")}
            >
              Pratinjau
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <BuilderSidebar />
        <div className="min-h-0 min-w-0 flex-1">
          {!mounted ? (
            // Pre-hydration shell: responsive via CSS only. Editor is full width
            // on mobile; the preview joins on md+. Mirrors the final layout so
            // the swap to the resizable group / tabs isn't a visible shift.
            <div className="flex h-full">
              <div className="h-full w-full md:w-auto md:min-w-[24%] md:max-w-[40%] md:basis-[24%] md:border-r">
                {editor}
              </div>
              <div className="hidden h-full flex-1 md:block">{preview}</div>
            </div>
          ) : isMobile ? (
            mobileTab === "edit" ? (
              editor
            ) : (
              preview
            )
          ) : (
            <ResizablePanelGroup
              orientation="horizontal"
              defaultLayout={{ editor: 24, preview: 76 }}
            >
              <ResizablePanel
                id="editor"
                defaultSize="24"
                minSize="24"
                maxSize="40"
              >
                {editor}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="preview"
                defaultSize="76"
                minSize="40"
                className="min-w-0"
              >
                {preview}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <EditorDialog />
      </Suspense>

      <AiCoverLetterModal
        open={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
      />
      <AiInterviewModal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
      />
    </div>
  );
}
