/**
 * Strip all HTML tags from a string, leaving readable plain text.
 * Used for character counting and for feeding the AI toolbar plain text.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  if (!html.includes("<")) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Heuristic: does this string look like authored rich-HTML from our editor?
 * (As opposed to a legacy plain-text description.)
 */
export function isHtml(value: string): boolean {
  return /<(p|ul|ol|li|h[23]|strong|b|em|i|a)[ >]/i.test(value);
}
