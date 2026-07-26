"use client";

import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { CvPreview } from "@/features/cv/components/cv-preview";
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
