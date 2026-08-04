"use client";

import { Loader2, UserRound } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/features/cv/lib/uploadthing";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";
import { PhotoCropDialog } from "./photo-crop-dialog";

const MAX_BYTES = 2 * 1024 * 1024;

export function PhotoField() {
  const photo = useCvStore((s) => s.personal.photo);
  const setPersonal = useCvStore((s) => s.setPersonal);
  const inputRef = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<string>();
  const [error, setError] = useState<string>();

  const { startUpload, isUploading } = useUploadThing("cvPhoto", {
    onClientUploadComplete: (res) => {
      if (res[0]) setPersonal({ photo: res[0].ufsUrl });
    },
  });

  const onPick = useCallback((file: File | undefined) => {
    setError(undefined);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar (JPG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ukuran foto maksimal 2MB.");
      return;
    }
    setPendingFile(URL.createObjectURL(file));
  }, []);

  const onCrop = useCallback(
    async (blob: Blob) => {
      setPendingFile(undefined);
      await startUpload([new File([blob], "foto.jpg", { type: "image/jpeg" })]);
    },
    [startUpload],
  );

  const onCancelCrop = useCallback(() => {
    if (pendingFile) URL.revokeObjectURL(pendingFile);
    setPendingFile(undefined);
  }, [pendingFile]);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted transition-colors hover:border-primary hover:bg-muted/60 disabled:opacity-60"
      >
        {photo ? (
          // biome-ignore lint/performance/noImgElement: PDF renderer needs plain img
          <img
            src={photo}
            alt="Foto profile"
            className="size-full object-cover"
          />
        ) : isUploading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : (
          <UserRound className="size-7 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </button>

      <div className="flex flex-col gap-1">
        {isUploading ? (
          <span className="text-sm text-muted-foreground">Mengunggah…</span>
        ) : photo ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Ganti foto
          </Button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-fit rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Unggah foto
            </button>
            <span className="text-xs text-muted-foreground">
              JPG, PNG, WebP · Maks. 2MB
            </span>
          </>
        )}
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : null}
      </div>

      {pendingFile ? (
        <PhotoCropDialog
          src={pendingFile}
          onCancel={onCancelCrop}
          onCrop={onCrop}
        />
      ) : null}
    </div>
  );
}
