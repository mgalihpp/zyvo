"use client";

import type { JobApplication } from "@prisma/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CopyIcon, ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { BoardColumn } from "@/features/job-tracker/schemas/job-tracker";
import { trpc } from "@/lib/trpc/client";

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

function formatDate(value: Date | string | null | undefined): string {
  return value
    ? format(new Date(value), "d MMM yyyy", { locale: localeId })
    : "—";
}

function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

function salaryRange(app: JobApplication): string {
  if (app.salaryMin != null && app.salaryMax != null)
    return `${formatRupiah(app.salaryMin)} – ${formatRupiah(app.salaryMax)}`;
  if (app.salaryMin != null) return `≥ ${formatRupiah(app.salaryMin)}`;
  if (app.salaryMax != null) return `≤ ${formatRupiah(app.salaryMax)}`;
  return "—";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function ApplicationDetailSheet({
  app,
  columns,
  open,
  onOpenChange,
  onEdit,
}: {
  app: JobApplication | undefined;
  columns: BoardColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (app: JobApplication) => void;
}) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Reset transient state when a different application is opened.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on app change only
  useEffect(() => {
    setNote("");
    setEmail(null);
    setEmailError(null);
  }, [app?.id]);

  const { data: cvs } = trpc.cv.list.useQuery(undefined, { enabled: open });

  const addNoteMutation = trpc.jobTracker.addNote.useMutation({
    onSuccess: () => {
      utils.jobTracker.getBoard.invalidate();
      setNote("");
      toast.add({ title: "Catatan ditambahkan" });
    },
    onError: (err) => toast.add({ title: err.message }),
  });

  const emailMutation = trpc.jobTracker.generateFollowUpEmail.useMutation({
    onSuccess: (data) => {
      setEmail(data.email);
      setEmailError(null);
    },
    onError: (err) => setEmailError(err.message),
  });

  if (!app) return null;

  const column = columns.find((c) => c.id === app.columnId);
  const kindLabel = (kind: string | null | undefined) =>
    columns.find((c) => c.kind === kind)?.name ?? kind ?? "?";
  const cvTitle = app.cvId
    ? (cvs?.find((cv) => cv.id === app.cvId)?.title ?? "—")
    : "—";
  const timeline = [...app.timeline].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="pr-12">
          <SheetTitle>{app.position}</SheetTitle>
          <SheetDescription>{app.company}</SheetDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {column && <Badge variant="secondary">{column.name}</Badge>}
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
              >
                Lowongan
                <ExternalLinkIcon className="size-3" aria-hidden="true" />
              </a>
            )}
            <Button size="sm" variant="outline" onClick={() => onEdit(app)}>
              Edit
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          <section className="space-y-2 text-xs">
            <DetailRow label="Lokasi" value={app.location || "—"} />
            <DetailRow
              label="Tipe Kerja"
              value={
                app.workType ? (WORK_TYPE_LABELS[app.workType] ?? "—") : "—"
              }
            />
            <DetailRow label="Gaji" value={salaryRange(app)} />
            <DetailRow label="CV Terkait" value={cvTitle} />
            <DetailRow
              label="Tanggal Melamar"
              value={formatDate(app.appliedAt)}
            />
            <DetailRow
              label="Tanggal Follow-up"
              value={formatDate(app.followUpDate)}
            />
            {app.notes && (
              <div className="space-y-1 pt-1">
                <span className="text-muted-foreground">Catatan</span>
                <p className="whitespace-pre-wrap">{app.notes}</p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada aktivitas.
              </p>
            ) : (
              <ul className="space-y-3 border-l pl-4">
                {timeline.map((event) => (
                  <li key={event.id} className="space-y-0.5">
                    <p className="text-xs">
                      {event.type === "status_change"
                        ? `Status berubah: ${kindLabel(event.fromKind)} → ${kindLabel(event.toKind)}`
                        : event.note}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(event.createdAt), "d MMM yyyy, HH:mm", {
                        locale: localeId,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Tambah Catatan</h3>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Tulis catatan..."
            />
            <Button
              size="sm"
              disabled={!note.trim()}
              loading={addNoteMutation.isPending}
              loadingText="Menyimpan..."
              onClick={() =>
                addNoteMutation.mutate({ id: app.id, note: note.trim() })
              }
            >
              Simpan Catatan
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Email Follow-up</h3>
            <Button
              size="sm"
              variant="outline"
              loading={emailMutation.isPending}
              loadingText="Membuat email..."
              onClick={() => emailMutation.mutate({ id: app.id })}
            >
              <SparklesIcon data-icon="inline-start" aria-hidden="true" />
              Buat Email Follow-up (AI)
            </Button>
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
            {email && (
              <div className="space-y-2">
                <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-xs">
                  {email}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(email);
                    toast.add({ title: "Tersalin" });
                  }}
                >
                  <CopyIcon data-icon="inline-start" aria-hidden="true" />
                  Salin
                </Button>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
