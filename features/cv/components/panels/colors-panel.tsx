"use client";

import { RotateCcwIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRESETS } from "@/features/cv/lib/color-presets";
import { contrastRatio, passesAA } from "@/features/cv/lib/contrast";
import type { CvColors } from "@/features/cv/schemas/cv";
import { emptyColors } from "@/features/cv/schemas/cv";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

/** Editable color tokens (everything on `CvColors` except the preset marker). */
type ColorKey = Exclude<keyof CvColors, "presetId">;

const COLOR_LABELS: Record<ColorKey, string> = {
  background: "Latar Belakang",
  heading: "Judul",
  text: "Teks Utama",
  link: "Tautan",
  accent: "Aksen",
};

const COLOR_KEYS = Object.keys(COLOR_LABELS) as ColorKey[];

const PRESET_LABELS: Record<string, string> = {
  professional: "Profesional",
  modern: "Modern",
  colorful: "Berwarna",
  dark: "Gelap",
  neutral: "Netral",
};

/** Foreground/background pairs checked against WCAG AA (4.5:1). */
const CONTRAST_PAIRS: { fg: ColorKey; bg: ColorKey; label: string }[] = [
  { fg: "heading", bg: "background", label: "Judul : Latar" },
  { fg: "text", bg: "background", label: "Teks : Latar" },
  { fg: "link", bg: "background", label: "Tautan : Latar" },
];

/** Compares the five color tokens, ignoring `presetId`. */
function sameColors(a: CvColors, b: CvColors) {
  return COLOR_KEYS.every((key) => a[key] === b[key]);
}

const FULL_HEX = /^#[0-9a-fA-F]{6}$/;
const PARTIAL_HEX = /^#[0-9a-fA-F]{0,6}$/;

export function ColorsPanel() {
  const storeColors = useCvStore((s) => s.colors);
  const draftColors = useCvStore((s) => s.draftColors);
  const setDraftColors = useCvStore((s) => s.setDraftColors);
  const commitColors = useCvStore((s) => s.commitColors);
  const resetColors = useCvStore((s) => s.resetColors);

  const [tab, setTab] = useState<"presets" | "custom">("presets");
  // Hex text inputs are free-typed, so they keep local state until the value
  // parses as a full #rrggbb — otherwise every keystroke would clobber the draft.
  const [hexDraft, setHexDraft] = useState<Partial<Record<ColorKey, string>>>(
    {},
  );

  // The draft (uncommitted) colors win while the panel is open; the preview
  // reads the same value so edits show live before "Terapkan".
  const current = draftColors ?? storeColors;

  const patch = useCallback(
    (key: ColorKey, value: string) => {
      setDraftColors({ ...current, presetId: "custom", [key]: value });
    },
    [current, setDraftColors],
  );

  const hasChanges = draftColors !== null && !sameColors(current, storeColors);

  return (
    <div>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Warna</h2>
        <p className="text-xs text-muted-foreground">
          Atur warna tema CV Anda. Perubahan tampil langsung di pratinjau.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "presets" | "custom")}
      >
        <div className="border-b px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="presets" className="flex-1">
              Tema Preset
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">
              Kustom
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="presets" className="p-4">
          <div
            className="grid grid-cols-2 gap-3"
            role="radiogroup"
            aria-label="Preset warna"
          >
            {Object.values(PRESETS).map((preset) => {
              const isActive = sameColors(current, preset);
              return (
                // biome-ignore lint/a11y/useSemanticElements: card needs a color swatch row, not an <input radio>
                <button
                  key={preset.presetId}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setDraftColors({ ...preset })}
                  className={`overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? "border-primary ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className="flex gap-1 p-3"
                    style={{ backgroundColor: preset.background }}
                  >
                    {(["accent", "heading", "text", "link"] as const).map(
                      (key) => (
                        <span
                          key={key}
                          className="size-5 rounded border border-black/10"
                          style={{ backgroundColor: preset[key] }}
                        />
                      ),
                    )}
                  </div>
                  <div className="border-t px-3 py-2 text-sm font-medium">
                    {PRESET_LABELS[preset.presetId] ?? preset.presetId}
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 p-4">
          {COLOR_KEYS.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`color-${key}`}>{COLOR_LABELS[key]}</Label>
              <div className="flex items-center gap-2">
                <input
                  id={`color-${key}`}
                  type="color"
                  value={current[key]}
                  onChange={(e) => {
                    setHexDraft((d) => ({ ...d, [key]: undefined }));
                    patch(key, e.target.value);
                  }}
                  className="size-9 shrink-0 cursor-pointer rounded-md border border-input p-0.5"
                />
                <input
                  type="text"
                  aria-label={`${COLOR_LABELS[key]} (hex)`}
                  value={hexDraft[key] ?? current[key]}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!PARTIAL_HEX.test(value)) return;
                    setHexDraft((d) => ({ ...d, [key]: value }));
                    if (FULL_HEX.test(value)) patch(key, value.toLowerCase());
                  }}
                  onBlur={() =>
                    setHexDraft((d) => ({ ...d, [key]: undefined }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="border-t px-4 py-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Kontras Warna (WCAG AA)
        </p>
        <div className="space-y-1.5">
          {CONTRAST_PAIRS.map((pair) => {
            const fg = current[pair.fg];
            const bg = current[pair.bg];
            const ratio = contrastRatio(fg, bg);
            const ok = passesAA(fg, bg);
            return (
              <div
                key={pair.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-flex size-4 items-center justify-center rounded border border-black/10 text-[9px] font-bold"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    Aa
                  </span>
                  <span className="text-muted-foreground">{pair.label}</span>
                </span>
                <span className={ok ? "text-emerald-600" : "text-amber-600"}>
                  {ratio.toFixed(1)}:1 {ok ? "✓" : "⚠ rendah"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 border-t p-4">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={!hasChanges}
          onClick={commitColors}
        >
          Terapkan
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setHexDraft({});
            // Discard the draft when there is one, otherwise fall back to the
            // default palette (which still needs "Terapkan" to be saved).
            if (draftColors) resetColors();
            else setDraftColors({ ...emptyColors });
          }}
        >
          <RotateCcwIcon className="size-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
