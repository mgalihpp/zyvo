/** Wrap each non-empty line of text as an HTML `<ul><li>` bullet list. */
export function toBulletHtml(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
  if (lines.length === 0) return text;
  return `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}
