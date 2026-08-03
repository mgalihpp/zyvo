# Rich Text Editor for CV Description Fields

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text `CharCountTextarea` with a Tiptap-based rich text editor on all CV description fields (summary, experience, certification, organization, project, custom).

**Architecture:** A reusable `RichTextarea` component wraps Tiptap with a minimal toolbar (Bold, Italic, H2, H3, BulletList, OrderedList, Link). Content is stored as HTML strings in the existing `description`/`summary` fields. A new `HtmlContent` renderer displays that HTML in all CV templates.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Tiptap (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`), Zombie-Zod schemas, Zustand store, Biome lint.

## Global Constraints

- Do NOT guess Next.js/React APIs from older versions; check `node_modules/next/dist/docs/` first.
- Tailwind v4 — use `@import "tailwindcss"` + `@theme`; no `@apply`.
- shadcn/ui via `@shadcn/react`; UI primitives live in `components/ui/`.
- Use `bun` for install/scripts. Lint: `bun lint` (Biome). No comments unless asked.
- Description fields must stay `z.string().max(2000)` in Zod — HTML tags count toward the limit.
- All CV description fields render as HTML via a shared `HtmlContent` component; existing plain-text values must render identically (safe to wrap in HTML).
- XSS: content is user-authored, but still sanitize before `dangerouslySetInnerHTML` (strip `<script>`, event handlers).

---

### Task 1: Install Tiptap dependencies

**Files:**
- Modify: `package.json`
- Modify: `bun.lock` (generated)

**Interfaces:**
- Consumes: nothing.
- Produces: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link` available to import.

- [ ] **Step 1: Install packages**

```bash
bun add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

- [ ] **Step 2: Verify install**

Run: `bun ls @tiptap/*`
Expected: all four tiptap packages listed in the output.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(deps): add tiptap rich text editor packages"
```

---

### Task 2: Create the `htmlToPlainText` utility

**Files:**
- Create: `lib/html.ts`

**Interfaces:**
- Consumes: none.
- Produces:
  - `stripHtml(html: string): string` — returns plain text with tags removed (for character counting).
  - `isHtml(value: string): boolean` — true if the string contains block-level HTML tags.
  - `DEFAULT_SANITIZE` DOMPurify config or a small manual sanitizer — see Task 3.

- [ ] **Step 1: Create `lib/html.ts`**

```ts
/**
 * Strip all HTML tags from a string, leaving readable plain text.
 * Used for character counting and for feeding the AI toolbar plain text.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  if (!html.includes("<")) return html;
  // Browser-less safe: decode entities then strip tags in a temp element.
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
```

- [ ] **Step 2: Run Biome lint**

Run: `bun lint`
Expected: no errors (or only pre-existing ones).

- [ ] **Step 3: Commit**

```bash
git add lib/html.ts
git commit -m "feat(html): add htmlToText strip utilities for rich text"
```

---

### Task 3: Sanitizer + `HtmlContent` renderer

**Files:**
- Create: `features/cv/components/html-content.tsx`

**Interfaces:**
- Consumes: `lib/html.ts` `isHtml`.
- Produces:
  - `HtmlContent({ html, className }: { html?: string; className?: string }): ReactNode` — renders plain text for legacy values, sanitized HTML for rich text.
  - `sanitizeHtml(html: string): string` — DOMPurify-based sanitizer.

- [ ] **Step 1: Install DOMPurify**

```bash
bun add dompurify
bun add -d @types/dompurify
```

- [ ] **Step 2: Create `HtmlContent`**

```tsx
import DOMPurify from "dompurify";
import { isHtml } from "@/lib/html";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "ul", "ol", "li", "h2", "h3", "strong", "b", "em", "i", "a", "br", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/** Renders a description string as plain text (legacy) or sanitized HTML. */
export function HtmlContent({ html, className }: { html?: string; className?: string }) {
  if (!html) return null;
  if (!isHtml(html)) {
    return <div className={className} style={{ whiteSpace: "pre-line" }}>{html}</div>;
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
```

- [ ] **Step 3: Run Biome**

Run: `bun lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/html.ts features/cv/components/html-content.tsx package.json bun.lock
git commit -m "feat(cv): add HtmlContent renderer with sanitization"
```

---

### Task 4: Create the `RichTextEditor` component

**Files:**
- Create: `features/cv/components/rich-textarea.tsx`
- Check existing UI primitives: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/popover.tsx` (read before extending).

**Interfaces:**
- Consumes: `stripHtml` from `lib/html.ts`; shadcn `Button`, `Popover`, `Input`.
- Produces:
  - `RichTextarea({ value, onChange, maxLength = 2000, placeholder, className }): ReactNode`
    - `value: string` — HTML string.
    - `onChange: (html: string) => void` — fires with `editor.getHTML()` on every update.
  - Component self-owns its Tiptap editor instance via `useEditor`.

- [ ] **Step 1: Write a foundation for the editor component**

```tsx
"use client";

import { Link as LinkExt } from "@tiptap/extension-link";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html";

function ToolbarButton({
  onMouseDown,
  active,
  disabled,
  children,
  label,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={onMouseDown}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Write the full component with toolbar + link popover**

This single file self-owns the editor, toolbar, link popover, and character count. The `Editor` is a controlled-only-mount editor; external value sync happens in a `useEffect` so we never `setContent` during render.

```tsx
"use client";

import { Link as LinkExt } from "@tiptap/extension-link";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html";

function ToolbarButton({
  onMouseDown,
  active,
  children,
  label,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={onMouseDown}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      {children}
    </button>
  );
}

function RichToolbar({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [href, setHref] = useState(() => editor.getAttributes("link").href ?? "");

  if (!editor) return null;

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };

  const openLink = run(() => {
    setUrl(editor.getAttributes("link").href ?? "");
    setHref(editor.getAttributes("link").href ?? "");
    setOpen((o) => !o);
  });

  const applyLink = () => {
    if (url.trim()) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
      <ToolbarButton label="Tebal" active={editor.isActive("bold")} onMouseDown={run(() => editor.chain().focus().toggleBold().run())}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton label="Miring" active={editor.isActive("italic")} onMouseDown={run(() => editor.chain().focus().toggleItalic().run())}>
        <em>I</em>
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton label="Subjudul" active={editor.isActive("heading", { level: 2 })} onMouseDown={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>
        H2
      </ToolbarButton>
      <ToolbarButton label="Sub-subjudul" active={editor.isActive("heading", { level: 3 })} onMouseDown={run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>
        H3
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton label="Poin" active={editor.isActive("bulletList")} onMouseDown={run(() => editor.chain().focus().toggleBulletList().run())}>
        <span>•</span>
      </ToolbarButton>
      <ToolbarButton label="Nomor" active={editor.isActive("orderedList")} onMouseDown={run(() => editor.chain().focus().toggleOrderedList().run())}>
        <span>1.</span>
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<ToolbarButton label="Link" active={editor.isActive("link")} onMouseDown={openLink} />}>
          🔗
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {editor.isActive("link") ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => { editor.chain().focus().extendMarkRange("link").unsetLink().run(); setOpen(false); }}>
                  Hapus
                </Button>
              ) : null}
              <Button type="button" size="sm" onClick={applyLink}>
                Tambah
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

> **Note:** `href` state is kept for completeness but unused in the final UI; you may drop it to satisfy Biome's unused-var check. Keep `open`, `url`, `setUrl`.

- [ ] **Step 3: Finalize `RichTextarea` (mount-time sync via `useEffect`)**

```tsx
export function RichTextarea({
  value,
  onChange,
  maxLength = 2000,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExt.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. AI toolbar replace) back into the editor.
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  const count = stripHtml(value).length;

  return (
    <div className={cn("overflow-hidden rounded-md border border-input", className)}>
      <RichToolbar editor={editor} />
      <div className="tiptap" onClick={() => editor?.commands.focus()} onMouseDown={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1 text-xs text-muted-foreground">
        {placeholder ? <span className="mr-auto truncate text-muted-foreground/70">{placeholder}</span> : null}
        <span className={count > maxLength ? "font-medium text-destructive" : undefined}>
          {count}/{maxLength}
        </span>
      </div>
    </div>
  );
}
```

> **Important (`onMouseDown` on the content wrapper):** Without this, clicking the content area does not move the caret / focus. Tiptap's default editor is already focused on the content clickable region, but keep `onClick`/`onMouseDown` to focus to guard against a parent's `mousedown` stealing focus. `EditorContent editor={editor}` requires the `editor` prop.

- [ ] **Step 4: Run Biome**

Run: `bun lint`
Expected: no errors from this file (drop unused `href` if flagged).

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/rich-textarea.tsx
git commit -m "feat(cv): add RichTextarea Tiptap editor component"
```

---

### Task 5: Style the editor content

**Files:**
- Modify: `globals.css`

**Interfaces:**
- Consumes: the `RichTextarea` component from Task 4.
- Produces: styled `.tiptap` ProseMirror content — h2/h3, lists, strong, links.

- [ ] **Step 1: Add editor styles to `globals.css`**

```css
.tiptap {
  min-height: 6rem;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-foreground);
}
.tiptap:focus { outline: none; }
.tiptap p { margin: 0 0 0.5rem; }
.tiptap h2 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
.tiptap h3 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0; }
.tiptap ul { list-style: disc; padding-left: 1.25rem; margin: 0 0 0.5rem; }
.tiptap ol { list-style: decimal; padding-left: 1.25rem; margin: 0 0 0.5rem; }
.tiptap a { color: var(--color-primary); text-decoration: underline; }
.tiptap blockquote { border-left: 2px solid var(--color-border); padding-left: 0.75rem; margin: 0 0 0.5rem; }
```

- [ ] **Step 2: Confirm no TypeScript/React mismatches**

Run: `bun lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add globals.css
git commit -m "style(cv): style rich text editor content"
```

---

### Task 6: Replace `CharCountTextarea` with `RichTextarea` in the editor dialog

**Files:**
- Modify: `features/cv/components/panels/editor-dialog.tsx`

**Interfaces:**
- Consumes: `RichTextarea` from `RichTextarea`.
- Produces: description fields for summary + 5 list sections now edit rich HTML.

- [ ] **Step 1: Remove the obsolete `CharCountTextarea` and swap imports**

Replace the `CharCountTextarea` helper (its `maxLength`-style props move into `RichTextarea`) and update imports:

```tsx
import { RichTextarea } from "@/features/cv/components/rich-textarea";
```

- [ ] **Step 2: Update `SummaryBody`**

```tsx
<div className="space-y-4">
  <TipsBanner />
  <Field>
    <FieldLabel htmlFor="summary">Profil</FieldLabel>
    <RichTextarea
      value={summary ?? ""}
      onChange={(html) => setSummary(html)}
      maxLength={3000}
      placeholder="Paragraf singkat yang merangkum pengalaman, keunggulan, dan tujuan karier Anda."
    />
  </Field>
  <AiToolbar
    fieldType="ringkasan"
    value={stripHtml(summary ?? "")}
    onChange={(v) => setSummary(v)}
  />
</div>
```

> **AI toolbar note:** pass plain text into `AiToolbar` (`stripHtml`) for the prompt. The streamed result comes back via `onChange` as plain text; storing it is fine — when `RichTextarea` re-renders, Tiptap parses the plain string into a `<p>` block. No HTML wrapping needed.

- [ ] **Step 3: Update the five description fields**

In `ExperienceForm`, `CertificationForm`, `OrganizationForm`, `ProjectForm`, `CustomForm`, replace the `CharCountTextarea`:

```tsx
<CharCountTextarea rows={6} maxLength={2000} value={value.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} />
```

with:

```tsx
<RichTextarea
  value={value.description ?? ""}
  onChange={(html) => onChange({ description: html })}
  maxLength={2000}
  placeholder="..." // same placeholder text as before
/>
```

And wrap the `AiToolbar` for those sections with `value={stripHtml(value.description ?? "")}` (and its `onChange` unchanged). Repeat this exact block for `CertificationForm`, `OrganizationForm`, `ProjectForm`, and `CustomForm`.

- [ ] **Step 4: Update imports to include `stripHtml`**

```tsx
import { stripHtml } from "@/lib/html";
```

- [ ] **Step 5: Run Biome**

Run: `bun lint`
Expected: no new errors.

- [ ] **Step 6: Manual smoke test**

Run: `bun dev`, open a CV editor, edit a Summary and an Experience description. Confirm:
- Toolbar renders; Bold/Italic/H2/H3/lists/link work.
- Character count updates; max length enforced.
- Autosave icon appears after changes (store update wired via `onChange`).

- [ ] **Step 7: Commit**

```bash
git add features/cv/components/panels/editor-dialog.tsx
git commit -m "feat(cv): replace textareas with rich text editor in dialog"
```

---

### Task 7: Render rich HTML descriptions in CV templates

**Files:**
- Modify: Every template in `features/cv/components/templates/` — `classic.tsx`, `elegant.tsx`, `compact.tsx`, `creative.tsx`, `executive.tsx`, `formal.tsx`, `fresh-graduate.tsx`, `minimal.tsx`, `modern.tsx`, `professional.tsx`. Plus `fresh-graduate.tsx`.
- (Only the description rendering lines; each file may render `description` in several sections.)

**Interfaces:**
- Consumes: `HtmlContent` from `features/cv/components/html-content.tsx`.
- Produces: templates render desc.

- [ ] **Step 1: Import `HtmlContent` in each template**

```tsx
import { HtmlContent } from "@/features/cv/components/html-content";
```

- [ ] **Step 2: Replace description rendering**

For each location that currently shows `{exp.description}` (and likewise `proj`, `cert`, `org`, `custom`), replace:

```tsx
{exp.description ? (
  <p className="mt-1 whitespace-pre-line ...">{exp.description}</p>
) : null}
```

with:

```tsx
{exp.description ? (
  <HtmlContent className="mt-1 text-[var(--cv-color-text)]" html={exp.description} />
) : null}
```

> **Template wrapper classes:** Match each template's existing wrapper. Preserve the original `className` and `<p>`-level spacing by passing `className` to `HtmlContent` and dropping the surrounding `<p>` element (since `HtmlContent` renders a `div`). Example from `modern.tsx`: `className="mt-1 text-[var(--cv-color-text)]"`.

- [ ] **Step 3: Correct template-specific variants**

- `minimal.tsx` uses `<p className="mt-1 whitespace-pre-line">{exp.description}</p>` → `HtmlContent` with the same classes.
- All templates that render `item.description` in custom sections: same replacement.
- Keep `formatDateRange`, `join` helpers unchanged.

- [ ] **Step 4: Run Biome**

Run: `bun lint`
Expected: no new errors in the template files.

- [ ] **Step 5: Manual smoke test**

Run: `bun dev`. Create/edit a CV with rich text in a description, ensure the preview and each template (classic, modern, etc.) render bold/lists/links correctly.

- [ ] **Step 6: Commit**

```bash
git add features/cv/components/templates/ features/cv/components/panels/
git commit -m "feat(cv): render rich text descriptions in all templates"
```

---

### Task 8: End-to-end verification

**Files:** (no code changes)

- [ ] **Step 1: Full lint + build**

Run: `bun lint && bun build`
Expected: both pass.

- [ ] **Step 2: Manual full flow**

Run: `bun dev`.
1. Create a CV.
2. Edit summary + experience description with bold, list, heading, link.
3. Save; reload page; confirm content persists (autosave JSON).
4. Switch templates; confirm rich formatting renders in each.
5. Edit via AI toolbar; confirm content updates.

- [ ] **Step 3: Security check**

Inspect a rich description with a script tag: `/dev/null` — confirm `HtmlContent` sanitizes (no script executes).

- [ ] **Step 4: Commit any final fixes**

```bash
git add .
git status
git commit -m "chore(cv): verify rich text editor end-to-end"  # only if changes
```