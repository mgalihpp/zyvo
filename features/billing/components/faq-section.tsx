"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQS } from "@/features/billing/lib/billing-constants";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-sm font-medium">{q}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <p className="mt-3 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

export function FaqSection() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-16">
      <h2 className="text-2xl font-bold">Pertanyaan yang Sering Diajukan</h2>
      <div className="divide-y">
        {FAQS.map((faq) => (
          <FaqItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}
