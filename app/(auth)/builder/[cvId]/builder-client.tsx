"use client";

import { useEffect, useState } from "react";
import { CvPreview } from "@/components/cv/cv-preview";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useCvAutosave } from "@/hooks/use-cv-autosave";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CvContent } from "@/lib/schemas/cv";
import { useCvStore } from "@/lib/stores/cv-store";
import { BuilderSidebar } from "./builder-sidebar";
import { PanelContent } from "./panels";
import { EditorDialog } from "./panels/editor-dialog";
import { SaveIndicator } from "./save-indicator";

export function BuilderClient({
  cvId,
  initialContent,
}: {
  cvId: string;
  initialContent: CvContent;
}) {
  const hydrate = useCvStore((s) => s.hydrate);

  // Hydrate the store once for this CV.
  useEffect(() => {
    hydrate(cvId, initialContent);
  }, [cvId, initialContent, hydrate]);

  useCvAutosave();

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  const editor = <PanelContent />;

  return (
    <div className="flex h-screen flex-col">
      {/* Floating controls */}
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

      {/* Body */}
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
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize="30" minSize="20" maxSize="30">
                {editor}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="50" minSize="30">
                <CvPreview />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      <EditorDialog />
    </div>
  );
}
