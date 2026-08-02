"use client";

import { cn } from "@/lib/utils";

interface BillingHeaderProps {
  yearly: boolean;
  onYearlyChange: (yearly: boolean) => void;
  showHeading?: boolean;
}

export function BillingHeader({
  yearly,
  onYearlyChange,
  showHeading = true,
}: BillingHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      {showHeading && <h1 className="text-3xl font-bold">Paket &amp; Harga</h1>}
      <div className="flex items-center gap-1 rounded-full border bg-muted p-1 text-sm">
        <button
          type="button"
          onClick={() => onYearlyChange(false)}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            !yearly
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Bulanan
        </button>
        <div className="relative inline-flex rounded-full p-[2px] overflow-hidden">
          {yearly && (
            <span
              aria-hidden
              className="animate-badge-orbit pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[200%] rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, #f59e0b, #ef4444, #ec4899, #8b5cf6, #3b82f6, #22d3ee, #22c55e, #f59e0b 360deg)",
              }}
            />
          )}
          <button
            type="button"
            onClick={() => onYearlyChange(true)}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors",
              yearly
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            Tahunan{" "}
            <span
              className={cn(
                "text-xs",
                yearly ? "text-background/70" : "text-primary",
              )}
            >
              Hemat 6 bulan
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
