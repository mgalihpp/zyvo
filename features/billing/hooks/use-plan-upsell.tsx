"use client";

import { useState } from "react";
import { PlanUpsellDialog } from "@/features/billing/components/premium-template-upsell-dialog";

/**
 * Shared wiring for plan-gated failures: when a tRPC mutation rejects with
 * FORBIDDEN (CV slot limit, AI quota, locked feature), open the upsell dialog
 * instead of showing a bare error. Returns the dialog element to render.
 */
export function usePlanUpsell() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");

  const handleError = (err: unknown): boolean => {
    const code = (err as { data?: { code?: string } })?.data?.code;
    if (code !== "FORBIDDEN") return false;
    const message = (err as { message?: string })?.message;
    setDescription(message || "Fitur ini khusus paket Basic/Pro.");
    setOpen(true);
    return true;
  };

  const dialog = (
    <PlanUpsellDialog
      open={open}
      onOpenChange={setOpen}
      description={description}
    />
  );

  return { dialog, handleError };
}
