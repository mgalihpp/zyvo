"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { CvPreview } from "@/components/cv/cv-preview";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCvAutosave } from "@/hooks/use-cv-autosave";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePanelUrl } from "@/hooks/use-panel-url";
import type { CvContent } from "@/lib/schemas/cv";
import { type BuilderPanel, useCvStore } from "@/lib/stores/cv-store";
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
  const hydrate = useCvStore((s) => s.hydrate);

  // Hydrate the store once for this CV.
  useEffect(() => {
    hydrate(cvId, initialContent, initialPanel);
  }, [cvId, initialContent, initialPanel, hydrate]);

  useCvAutosave();
  usePanelUrl();

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  const editor = <PanelContent initialUser={initialUser} />;

  return (
    <div className="flex h-screen flex-col">
      <div className="absolute right-4 top-3 z-10 flex items-center gap-3">
        <SaveIndicator />
        {isMobile ? (
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
              Preview
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <BuilderSidebar />
        <div className="min-h-0 flex-1">
          {isMobile ? (
            mobileTab === "edit" ? (
              editor
            ) : (
              <CvPreview />
            )
          ) : (
            <ResizablePanelGroup
              orientation="horizontal"
              defaultLayout={{ editor: 30, preview: 70 }}
            >
              <ResizablePanel
                id="editor"
                defaultSize="30"
                minSize="24"
                maxSize="40"
              >
                {editor}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="preview" defaultSize="70" minSize="40">
                <CvPreview />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <EditorDialog />
      </Suspense>
    </div>
  );
}
