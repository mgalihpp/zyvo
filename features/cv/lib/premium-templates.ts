/**
 * Template ids gated behind Basic/Pro. Kept as a plain module (no component
 * imports) so the server can import it without pulling in React/lazy chunks.
 * Free: classic, minimal, modern, fresh-graduate, professional.
 */
export const PREMIUM_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  "executive",
  "creative",
  "elegant",
  "compact",
]);

export function isPremiumTemplate(id: string | null | undefined): boolean {
  return id != null && PREMIUM_TEMPLATE_IDS.has(id);
}
