"use client";

import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  CATEGORY_LABELS,
  FONT_REGISTRY,
  FONTS_BY_CATEGORY,
} from "@/features/cv/lib/fonts";
import type { FontId } from "@/features/cv/schemas/cv";
import { emptyTypography } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

function FontSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: FontId;
  onChange: (value: FontId) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as FontId)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS_BY_CATEGORY.map(({ category, ids }) => (
            <SelectGroup key={category}>
              <SelectLabel>{CATEGORY_LABELS[category]}</SelectLabel>
              {ids.map((fid) => (
                <SelectItem key={fid} value={fid}>
                  {FONT_REGISTRY[fid].label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SliderRow({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {display}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

export function TypographyPanel() {
  const typography = useCvStore((s) => s.typography);
  const setTypography = useCvStore((s) => s.setTypography);

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Tipografi</h2>
        <p className="text-xs text-muted-foreground">
          Atur font, ukuran, dan spasi teks CV Anda.
        </p>
      </div>

      <div className="space-y-6 p-4">
        <FontSelect
          id="font-heading"
          label="Font Judul"
          value={typography.fontHeading}
          onChange={(fontHeading) => setTypography({ fontHeading })}
        />
        <FontSelect
          id="font-body"
          label="Font Isi"
          value={typography.fontBody}
          onChange={(fontBody) => setTypography({ fontBody })}
        />

        <SliderRow
          id="font-scale"
          label="Ukuran"
          value={typography.scale}
          display={`${Math.round(typography.scale * 100)}%`}
          min={0.85}
          max={1.15}
          step={0.05}
          onChange={(scale) => setTypography({ scale })}
        />
        <SliderRow
          id="line-height"
          label="Spasi Baris"
          value={typography.lineHeight}
          display={typography.lineHeight.toFixed(2)}
          min={1.2}
          max={1.8}
          step={0.05}
          onChange={(lineHeight) => setTypography({ lineHeight })}
        />
        <SliderRow
          id="letter-spacing"
          label="Spasi Huruf"
          value={typography.letterSpacing}
          display={`${typography.letterSpacing.toFixed(3)}em`}
          min={-0.02}
          max={0.05}
          step={0.005}
          onChange={(letterSpacing) => setTypography({ letterSpacing })}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTypography({ ...emptyTypography })}
        >
          <RotateCcwIcon className="size-4" />
          Reset ke default
        </Button>
      </div>
    </div>
  );
}
