"use client";

import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
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
const TypographyPanel = lazy(() =>
  import("./typography-panel").then((m) => ({ default: m.TypographyPanel })),
);
const ColorsPanel = lazy(() =>
  import("./colors-panel").then((m) => ({ default: m.ColorsPanel })),
);

function PanelHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="border-b p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** Fallback for the lazy sections panel: header + a stack of section cards. */
function SectionsSkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="space-y-4 p-4">
        {["a", "b", "c", "d", "e", "f"].map((id) => (
          <div key={id} className="overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <Skeleton className="size-4 shrink-0 rounded" />
              <Skeleton className="h-4 flex-1 max-w-32" />
              <Skeleton className="size-7 shrink-0 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fallback for the lazy template panel: header + filter chips + card grid. */
function TemplateGridSkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="flex flex-wrap gap-2 border-b p-4">
        {["all", "a", "b", "c", "d", "e", "f"].map((id) => (
          <Skeleton key={id} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {["a", "b", "c", "d"].map((id) => (
          <div key={id} className="overflow-hidden rounded-lg border">
            <Skeleton className="aspect-[1/1.414] w-full rounded-none" />
            <div className="space-y-1.5 p-2.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fallback for the lazy typography panel: header + 2 selects, 3 sliders, reset. */
function TypographySkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="space-y-6 p-4">
        {["font-heading", "font-body"].map((id) => (
          <div key={id} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        {["scale", "line-height", "letter-spacing"].map((id) => (
          <div key={id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        ))}
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Fallback for the lazy colors panel: header + tabs + preset card grid. */
function ColorsSkeleton() {
  return (
    <div>
      <div className="space-y-2 border-b p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="border-b p-4">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {["a", "b", "c", "d"].map((id) => (
          <div key={id} className="overflow-hidden rounded-lg border">
            <div className="flex gap-1 p-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-5 rounded" />
              ))}
            </div>
            <div className="border-t p-2.5">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function ActivePanel() {
  const activePanel = useCvStore((s) => s.activePanel);

  switch (activePanel) {
    case "personal":
      return <PersonalPanel />;
    case "sections":
      return (
        <Suspense fallback={<SectionsSkeleton />}>
          <ContentPanel />
        </Suspense>
      );
    case "template":
      return (
        <Suspense fallback={<TemplateGridSkeleton />}>
          <TemplatePanel />
        </Suspense>
      );
    case "typography":
      return (
        <Suspense fallback={<TypographySkeleton />}>
          <TypographyPanel />
        </Suspense>
      );
    case "colors":
      return (
        <Suspense fallback={<ColorsSkeleton />}>
          <ColorsPanel />
        </Suspense>
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
