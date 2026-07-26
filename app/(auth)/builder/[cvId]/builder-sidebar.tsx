"use client";

import {
  ArrowLeftIcon,
  DownloadIcon,
  LayoutTemplateIcon,
  ListIcon,
  type LucideIcon,
  PaletteIcon,
  SparklesIcon,
  TypeIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type BuilderPanel, useCvStore } from "@/lib/stores/cv-store";
import { cn } from "@/lib/utils";

interface SidebarItem {
  id: BuilderPanel;
  label: string;
  icon: LucideIcon;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "personal", label: "Informasi Pribadi", icon: UserIcon },
  { id: "sections", label: "Bagian CV", icon: ListIcon },
  { id: "template", label: "Template", icon: LayoutTemplateIcon },
  { id: "typography", label: "Tipografi", icon: TypeIcon },
  { id: "colors", label: "Warna", icon: PaletteIcon },
  { id: "ai", label: "Asisten AI", icon: SparklesIcon },
  { id: "export", label: "Unduh", icon: DownloadIcon },
];

/** Left icon rail for switching between builder panels. */
export function BuilderSidebar() {
  const router = useRouter();
  const activePanel = useCvStore((s) => s.activePanel);
  const setActivePanel = useCvStore((s) => s.setActivePanel);

  return (
    <TooltipProvider delay={300}>
      <nav
        aria-label="Panel builder"
        className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r bg-background py-3"
      >
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={() => router.push("/builder")}
            aria-label="Kembali"
            className="mb-2 flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Kembali</TooltipContent>
        </Tooltip>

        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.id === activePanel;
          const Icon = item.icon;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger
                type="button"
                onClick={() => setActivePanel(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex size-9 items-center justify-center rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
