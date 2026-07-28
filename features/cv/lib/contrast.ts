export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  return (
    0.2126 * srgbChannel(rgb.r) +
    0.7152 * srgbChannel(rgb.g) +
    0.0722 * srgbChannel(rgb.b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(hexToRgb(a));
  const lumB = relativeLuminance(hexToRgb(b));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function passesAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5;
}

export function passesAALarge(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 3.0;
}

export function readableOn(bg: string): string {
  const lum = relativeLuminance(hexToRgb(bg));
  return lum > 0.179 ? "#000000" : "#ffffff";
}
