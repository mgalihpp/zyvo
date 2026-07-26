"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Back control for legal pages. Uses history when available (normal navigation),
 * and falls back to the home page when opened in a fresh tab (target="_blank"
 * from the auth pages), where there is no previous entry to return to.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={className}
    >
      <ArrowLeftIcon />
      Kembali
    </Button>
  );
}
