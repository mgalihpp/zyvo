"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { detectFaceCenter } from "@/features/cv/lib/face-detection";

const MAX_SCALE = 2;
const MAX_OUTPUT = 1024;

function renderCropCanvas(
  img: HTMLImageElement,
  pixelCrop: PixelCrop,
  scale: number,
  rotate: number,
  maxDim: number,
): HTMLCanvasElement | null {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  const cropW = pixelCrop.width * scaleX;
  const cropH = pixelCrop.height * scaleY;
  const fit = Math.min(1, maxDim / Math.max(cropW, cropH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropW * fit));
  canvas.height = Math.max(1, Math.round(cropH * fit));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  const fw = img.naturalWidth / 2;
  const fh = img.naturalHeight / 2;
  ctx.scale(fit, fit);
  ctx.translate(-pixelCrop.x * scaleX, -pixelCrop.y * scaleY);
  ctx.translate(fw, fh);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-fw, -fh);
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
  return canvas;
}

export function PhotoCropDialog({
  src,
  onCancel,
  onCrop,
}: {
  src: string;
  onCancel: () => void;
  onCrop: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const detectionDoneRef = useRef(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const { width, height } = img;
      const cropW = 80;
      const cropH = (cropW * width) / height;
      setCrop(
        centerCrop({ unit: "%", width: cropW, height: cropH }, width, height),
      );
      if (detectionDoneRef.current) return;
      detectionDoneRef.current = true;
      const renderedW = img.clientWidth || width;
      const renderedH = img.clientHeight || height;
      void (async () => {
        const center = await detectFaceCenter(img, renderedW, renderedH);
        if (!center) return;
        setCrop((prev) => {
          if (!prev) return prev;
          const halfW = prev.width / 2;
          const halfH = prev.height / 2;
          const x = Math.min(100 - prev.width, Math.max(0, center.x - halfW));
          const y = Math.min(100 - prev.height, Math.max(0, center.y - halfH));
          return { ...prev, x, y };
        });
      })();
    },
    [],
  );

  const onComplete = useCallback((pixelCrop: PixelCrop) => {
    setError(undefined);
    setCompletedCrop(pixelCrop);
  }, []);

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    const canvas = renderCropCanvas(
      imgRef.current,
      completedCrop,
      scale,
      rotate,
      MAX_OUTPUT,
    );
    if (!canvas) {
      setSaving(false);
      setError("Gagal memproses foto, coba foto lain.");
      return;
    }
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onCrop(blob);
        else setError("Gagal memproses foto, coba foto lain.");
      },
      "image/jpeg",
      0.92,
    );
  }, [completedCrop, scale, rotate, onCrop]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg" scrollable>
        <DialogHeader>
          <DialogTitle>Potong foto</DialogTitle>
          <DialogDescription>
            Geser, perbesar, atau putar foto lalu simpan hasilnya.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-md bg-muted">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={onComplete}
              aspect={1}
              ruleOfThirds
            >
              {/* biome-ignore lint/performance/noImgElement: crop preview needs plain img */}
              <img
                ref={imgRef}
                src={src}
                alt="Foto untuk dipotong"
                onLoad={onImageLoad}
                style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
                className="max-h-72 w-full object-contain"
              />
            </ReactCrop>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-12 shrink-0">Perbesar</span>
              <input
                type="range"
                min="0.5"
                max={MAX_SCALE}
                step="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
              <span className="w-8 shrink-0 text-right">
                {scale.toFixed(2)}x
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-12 shrink-0">Putar</span>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={rotate}
                onChange={(e) => setRotate(Number(e.target.value))}
                className="w-full"
              />
              <span className="w-8 shrink-0 text-right">{rotate}°</span>
            </label>
          </div>

          {error ? (
            <span className="text-xs text-destructive">{error}</span>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button
            onClick={handleSave}
            loading={saving}
            loadingText="Menyimpan…"
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
