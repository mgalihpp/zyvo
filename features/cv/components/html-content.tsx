import DOMPurify from "dompurify";
import { isHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

const ALLOWED_TAGS = [
  "p",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "a",
  "br",
  "span",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }) as string;
}

/** Renders a description string as plain text (legacy) or sanitized HTML. */
export function HtmlContent({
  html,
  className,
}: {
  html?: string;
  className?: string;
}) {
  if (!html) return null;
  if (!isHtml(html)) {
    return (
      <div
        className={cn(className, "html-content")}
        style={{ whiteSpace: "pre-line" }}
      >
        {html}
      </div>
    );
  }
  return (
    <div
      className={cn(className, "html-content")}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by DOMPurify
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
