import { Skeleton } from "@/components/ui/skeleton";
import { HELP_FAQS } from "@/features/help/lib/faq-data";

/** Route-level loading UI for help (matches help-page.tsx structure). */
export default function HelpLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Header: "Butuh bantuan?" + subtitle. */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Contact card. */}
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-52 rounded-md" />
        </div>
      </div>

      {/* FAQ card. */}
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <Skeleton className="h-5 w-40" />
        <div className="divide-y">
          {HELP_FAQS.map((_faq, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="size-4 shrink-0 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
