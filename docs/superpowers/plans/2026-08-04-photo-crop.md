# Photo Upload with Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users crop their CV photo before it uploads.

**Architecture:** File → object URL → crop Dialog (free-ratio resize + zoom + rotate, live preview) → canvas → JPEG Blob → existing UploadThing `cvPhoto` upload → store URL. Client-side only, no server changes.

**Tech Stack:** `react-image-crop`, existing Base UI Dialog (`components/ui/dialog.tsx`), existing `useUploadThing` helper.

## Global Constraints

- `photo` in `features/cv/schemas/cv.ts` stays a URL string — no schema change.
- UploadThing `cvPhoto` route unchanged (2MB, 1 file).
- All strings hardcoded in Indonesian, matching current `photo-field.tsx`.
- Follow existing patterns: `"use client"`, `cn()` util, shadcn/Base UI components.
- Bun for installs: `bun add`.

---

### Task 1: Install react-image-crop

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
bun add react-image-crop
```

- [ ] **Step 2: Verify install**

```bash
bun pm ls | grep react-image-crop
```

Expected: `react-image-crop` listed with a version.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add react-image-crop"
```

---

### Task 2: Build photo-crop-dialog component

**Files:**
- Create: `features/cv/components/panels/photo-crop-dialog.tsx`
- Test: manual via `bun dev` (no component test framework in repo)

**Interfaces:**
- Consumes: `components/ui/dialog.tsx` (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`), `components/ui/button.tsx` (`Button`), `cn` from `@/lib/utils`.
- Produces: `PhotoCropDialog({ src: string, onCancel: () => void, onCrop: (blob: Blob) => void })` — renders crop UI in a Dialog; calls `onCrop(blob)` with cropped JPEG Blob on save, `onCancel()` on close.

- [ ] **Step 1: Write the component**

Create `features/cv/components/panels/photo-crop-dialog.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, cropToCanvas, cropToImg, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_SCALE = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PhotoCropDialog({ src, onCancel, onCrop }: { src: string; onCancel: () => void; onCrop: (blob: Blob) => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [preview, setPreview] = useState<string>();
  const [saving, setSaving] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop({ unit: "%", width: 80 }, width, height));
  }, []);

  const updatePreview = useCallback(
    async (pixelCrop: PixelCrop) => {
      if (!imgRef.current) return;
      setPreview(await cropToImg(imgRef.current, pixelCrop, scale, rotate));
    },
    [scale, rotate],
  );

  const onComplete = useCallback(
    (pixelCrop: PixelCrop) => {
      setCompletedCrop(pixelCrop);
      void updatePreview(pixelCrop);
    },
    [updatePreview],
  );

  useEffect(() => {
    if (completedCrop) void updatePreview(completedCrop);
  }, [scale, rotate, completedCrop, updatePreview]);

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    await cropToCanvas(imgRef.current, canvas, completedCrop, scale, rotate);
    canvas.toBlob((blob) => {
      setSaving(false);
      if (blob) onCrop(blob);
    }, "image/jpeg", 0.92);
  }, [completedCrop, scale, rotate, onCrop]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Potong foto</DialogTitle>
          <DialogDescription>Geser, perbesar, atau putar foto lalu simpan hasilnya.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-md bg-muted">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={onComplete}
              aspect={undefined}
              ruleOfThirds
            >
              {/* biome-ignore lint/performance/noImgElement: crop preview needs plain img */}
              <img ref={imgRef} src={src} alt="Foto untuk dipotong" onLoad={onImageLoad} className="max-h-72 w-full object-contain" />
            </ReactCrop>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-12 shrink-0">Perbesar</span>
              <input type="range" min="0.5" max={MAX_SCALE} step="0.05" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
              <span className="w-8 shrink-0 text-right">{scale.toFixed(2)}x</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-12 shrink-0">Putar</span>
              <input type="range" min="0" max="360" step="15" value={rotate} onChange={(e) => setRotate(Number(e.target.value))} className="w-full" />
              <span className="w-8 shrink-0 text-right">{rotate}°</span>
            </label>
          </div>

          {preview ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Hasil:</span>
              {/* biome-ignore lint/performance/noImgElement: crop preview needs plain img */}
              <img src={preview} alt="Hasil potongan" className="size-16 rounded-full object-cover ring-1 ring-border" />
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button onClick={handleSave} loading={saving} loadingText="Menyimpan…">
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: compiles without type errors.

- [ ] **Step 3: Commit**

```bash
git add features/cv/components/panels/photo-crop-dialog.tsx
git commit -m "feat: photo crop dialog component"
```

---

### Task 3: Wire crop dialog into photo-field

**Files:**
- Modify: `features/cv/components/panels/photo-field.tsx`
- Test: manual via `bun dev`

**Interfaces:**
- Consumes: `PhotoCropDialog({ src, onCancel, onCrop })` from Task 2.
- Produces: file picker routes through crop before upload; `setPersonal({ photo: url })` unchanged.

- [ ] **Step 1: Modify photo-field.tsx**

Replace the whole file:

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
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
          <img src={photo} alt="Foto profile" className="size-full object-cover" />
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
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Ganti foto
          </Button>
        ) : (
          <>
            <button type="button" onClick={() => inputRef.current?.click()} className="w-fit rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
              Unggah foto
            </button>
            <span className="text-xs text-muted-foreground">JPG, PNG, WebP · Maks. 2MB</span>
          </>
        )}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>

      {pendingFile ? <PhotoCropDialog src={pendingFile} onCancel={onCancelCrop} onCrop={onCrop} /> : null}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `bun lint`
Expected: no errors.

- [ ] **Step 3: Manual test with `bun dev`**

1. Open builder, personal panel → "Unggah foto".
2. Pick image → crop dialog opens with preview.
3. Drag box, zoom, rotate → live preview updates.
4. Simpan → uploads → round avatar shows.
5. Pick oversized (>2MB) file → inline error, no dialog.
6. Cancel dialog → no photo change.
7. Export PDF → cropped photo present.

Expected: all behaviors work.

- [ ] **Step 4: Commit**

```bash
git add features/cv/components/panels/photo-field.tsx
git commit -m "feat: crop photo before upload"
```
