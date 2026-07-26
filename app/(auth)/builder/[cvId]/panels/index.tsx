"use client";

import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCvStore } from "@/lib/stores/cv-store";
import { type BuilderUser, PanelTopBar } from "./panel-topbar";
import { PersonalForm } from "./personal-form";

// Heavy panels are code-split: the sections panel pulls in dnd-kit and the
// template panel renders five full template previews. Loading them on demand
// keeps the initial editor bundle small.
const ContentPanel = lazy(() =>
  import("./content-panel").then((m) => ({ default: m.ContentPanel })),
);
const TemplatePanel = lazy(() =>
  import("./template-panel").then((m) => ({ default: m.TemplatePanel })),
);

/** Non-sticky heading rendered at the top of each panel's scrollable body. */
function PanelHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="border-b p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** Fallback shown while a lazily-loaded panel chunk is fetched. */
function PanelSkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

/** Simple placeholder for panels that are not built yet. */
function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <PanelHeader title={title} />
      <div className="flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {note}
      </div>
    </div>
  );
}

function PersonalPanel() {
  return (
    <div>
      <PanelHeader
        title="Informasi Pribadi"
        note="Tambahkan informasi kontak & data pribadi Anda."
      />
      <div className="p-4">
        <PersonalForm />
      </div>
    </div>
  );
}

/** Renders the panel body matching the sidebar's active selection. */
function ActivePanel() {
  const activePanel = useCvStore((s) => s.activePanel);

  switch (activePanel) {
    case "personal":
      return <PersonalPanel />;
    case "sections":
      return (
        <Suspense fallback={<PanelSkeleton />}>
          <ContentPanel />
        </Suspense>
      );
    case "template":
      return (
        <Suspense fallback={<PanelSkeleton />}>
          <TemplatePanel />
        </Suspense>
      );
    case "typography":
      return (
        <Placeholder
          title="Tipografi"
          note="Pengaturan font akan hadir di sini."
        />
      );
    case "colors":
      return (
        <Placeholder
          title="Warna"
          note="Pengaturan warna akan hadir di sini."
        />
      );
    case "ai":
      return (
        <Placeholder title="Asisten AI" note="Fitur AI akan hadir di sini." />
      );
    case "export":
      return (
        <Placeholder title="Unduh" note="Opsi unduh PDF akan hadir di sini." />
      );
    default:
      return null;
  }
}

/**
 * Editor column: a single scroll container with a sticky CV switcher top bar
 * followed by the active panel (whose own header scrolls with the content).
 */
export function PanelContent({ initialUser }: { initialUser: BuilderUser }) {
  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <PanelTopBar initialUser={initialUser} />
      <ActivePanel />
    </div>
  );
}
