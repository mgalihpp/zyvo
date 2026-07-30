"use client";

import { cn } from "@/lib/utils";

interface BillingHeaderProps {
  yearly: boolean;
  onYearlyChange: (yearly: boolean) => void;
}

export function BillingHeader({ yearly, onYearlyChange }: BillingHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold">Paket &amp; Harga</h1>
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
        <button
          type="button"
          onClick={() => onYearlyChange(true)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors",
            yearly
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Tahunan{" "}
          <span className={cn("text-xs", yearly ? "text-background/70" : "text-primary")}>
            Hemat 2 bulan
          </span>
        </button>
      </div>
    </div>
  );
}
