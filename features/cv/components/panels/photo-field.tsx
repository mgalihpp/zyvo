"use client";

import { UserRound } from "lucide-react";
import { UploadButton } from "@/features/cv/lib/uploadthing";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

/** Upload/preview for the CV profile photo (in the "Informasi Pribadi" panel). */
export function PhotoField() {
  const photo = useCvStore((s) => s.personal.photo);
  const setPersonal = useCvStore((s) => s.setPersonal);

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted">
        {photo ? (
          // Plain <img>: the same markup is reused by the PDF renderer.
          // biome-ignore lint/performance/noImgElement: Puppeteer PDF export needs a plain img
          <img
            src={photo}
            alt="Foto profile"
            className="size-full object-cover"
          />
        ) : (
          <UserRound className="size-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <UploadButton
          endpoint="cvPhoto"
          onClientUploadComplete={(res) => {
            if (res[0]) setPersonal({ photo: res[0].ufsUrl });
          }}
          appearance={{
            button:
              "bg-primary text-primary-foreground text-sm font-medium h-8 px-3 rounded-md hover:opacity-90 transition-opacity ut-uploading:opacity-60",
            allowedContent: "text-muted-foreground text-xs",
          }}
        />
        {photo ? (
          <button
            type="button"
            onClick={() => setPersonal({ photo: "" })}
            className="text-destructive text-xs hover:underline"
          >
            Hapus foto
          </button>
        ) : null}
      </div>
    </div>
  );
}
