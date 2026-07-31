"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiGeneratorModal({ open, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [field, setField] = useState("");
  const [summary, setSummary] = useState("");

  const generateMutation = trpc.ai.generate.useMutation();
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => router.push(`/builder/${cv.id}`),
  });

  async function handleGenerate() {
    if (!name.trim() || !field.trim()) return;
    const content = await generateMutation.mutateAsync({
      name,
      field,
      summary,
    });
    await createMutation.mutateAsync(content);
  }

  const isPending = generateMutation.isPending || createMutation.isPending;
  const error = generateMutation.error ?? createMutation.error;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat CV dengan AI</DialogTitle>
          <DialogDescription>
            Isi informasi singkat, AI akan membuat draft CV lengkap untuk Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-xs font-medium"
              htmlFor="gen-name"
            >
              Nama lengkap <span className="text-destructive">*</span>
            </label>
            <Input
              id="gen-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Budi Santoso"
              disabled={isPending}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium"
              htmlFor="gen-field"
            >
              Bidang / posisi yang dilamar{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="gen-field"
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="Software Engineer, Marketing Manager, ..."
              disabled={isPending}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium"
              htmlFor="gen-summary"
            >
              Ringkasan pengalaman (opsional)
            </label>
            <Textarea
              id="gen-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="3 tahun pengalaman di startup fintech sebagai backend developer, pernah handle sistem pembayaran..."
              className="min-h-[80px] resize-none text-xs"
              disabled={isPending}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error.message}</p>}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="flex-1"
              onClick={handleGenerate}
              loading={isPending}
              loadingText="Membuat CV..."
              disabled={!name.trim() || !field.trim()}
            >
              Buat dengan AI
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
