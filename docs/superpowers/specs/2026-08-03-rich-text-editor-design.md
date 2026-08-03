# Rich Text Editor for CV Description Fields

## Overview

Replace plain-text `CharCountTextarea` with a rich text editor (Tiptap) on all description fields in the CV builder: summary, experience, certification, organization, project, and custom.

## Goals

- Allow users to format description content with bold, italic, headings (H2/H3), bullet/ordered lists, and hyperlinks
- Maintain the current max 2000 character limit with live counter
- Preserve the existing AI toolbar integration
- Store content as HTML strings (compatible with existing `z.string()` schemas and MongoDB)

## Non-Goals

- Image/media embedding
- Collaborative editing
- Table support
- Undo/redo customization beyond Tiptap defaults

## Library Choice

**Tiptap** (headless, ProseMirror-based) — chosen for:
- Lightweight core (~50KB gzipped with extensions)
- Headless architecture styles perfectly with Tailwind CSS + shadcn
- Excellent React integration (`useEditor`, `EditorContent`)
- Rich extension ecosystem

### Packages to Install

```
@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

## Architecture

### New Component: `RichTextarea`

**File:** `components/ui/rich-textarea.tsx`

A reusable wrapper around Tiptap that:
- Accepts `value: string` (HTML) and `onChange: (html: string) => void`
- Renders a minimal toolbar above the editor content area
- Shows a character count indicator below the editor
- Uses Tailwind for all styling (consistent with shadcn design system)
- Handles keyboard shortcuts (Ctrl+B for bold, Ctrl+I for italic)

### Tiptap Extensions

| Extension | Source | Purpose |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Bold, Italic, Heading (H2, H3), BulletList, OrderedList, Paragraph, HardBreak, History |
| `Link` | `@tiptap/extension-link` | Hyperlink insertion with URL input popover |

### Toolbar Layout

```
[ B ] [ I ] [ H2 ] [ H3 ] | [ • List ] [ 1. List ] [ Link ]
```

- Buttons use existing shadcn `Button` component with `variant="ghost"` and `size="icon-sm"`
- Active state indicated by `bg-primary text-primary-foreground` when `editor.isActive(...)` is true
- Link button opens a small popover/popover for URL input (using existing shadcn `Popover`)
- Toolbar is hidden when editor is not focused (optional: always visible)

### Storage Format

Content stored as **HTML strings** — e.g. `<p><strong>Bold</strong> text with <a href="https://example.com">link</a></p>`

- HTML output via `editor.getHTML()`
- Input via `content` prop in `useEditor`
- Character count: strip HTML tags, count plain text characters

### Integration Points

#### 1. Editor Dialog (`editor-dialog.tsx`)

Replace all `CharCountTextarea` usages in description fields:
- `SummaryBody` → description field
- `ExperienceForm` → description field
- `CertificationForm` → description field
- `OrganizationForm` → description field
- `ProjectForm` → description field
- `CustomForm` → description field

Each replacement:
```tsx
// Before
<CharCountTextarea rows={5} maxLength={2000} value={...} onChange={...} />

// After
<RichTextarea maxLength={2000} value={...} onChange={...} />
```

#### 2. Zod Schemas (`cv.ts`)

**No changes required.** The `z.string().max(2000)` validation remains valid — HTML characters are counted toward the limit. If stricter validation is desired (e.g., counting only plain text), add a custom Zod transform later.

#### 3. AI Toolbar (`_ai-tools.tsx`)

The AI toolbar currently accepts `value: string` and `onChange: (v: string) => void`. With HTML content:
- When AI generates/suggests content, it should return HTML-compatible output
- The toolbar can strip HTML for display but preserve formatting
- **Minimal change needed** — AI toolbar passes value through; Tiptap accepts it

#### 4. CV Preview/Templates

Templates render `description` via text nodes. To support rich text:
- Add a utility `dangerouslySetInnerHTML` renderer for description fields
- Or parse HTML → React nodes using a lightweight HTML parser
- Since content is user-authored (not external), XSS is not a concern

**Recommended approach:** Add a `HtmlContent` utility component that wraps `dangerouslySetInnerHTML` with basic sanitization (strip script tags, event handlers).

## Component API

```tsx
interface RichTextareaProps {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number; // default 2000
  placeholder?: string;
  className?: string;
}
```

## File Changes Summary

| File | Change |
|------|--------|
| `components/ui/rich-textarea.tsx` | **New** — RichTextarea component |
| `components/ui/toolbar-button.tsx` | **New** — Reusable toolbar button component (optional, can inline) |
| `panels/editor-dialog.tsx` | Replace CharCountTextarea → RichTextarea in 6 form components |
| `panels/_ai-tools.tsx` | Minor — ensure AI output handles HTML gracefully |
| `templates/shared.tsx` | Add `HtmlContent` component for rendering HTML descriptions |
| `templates/*.tsx` | Update description rendering to use `HtmlContent` |
| `package.json` | Add Tiptap dependencies |

## Testing

1. Verify all 6 description fields render the rich text editor
2. Test formatting: bold, italic, H2, H3, bullet list, ordered list, link
3. Test character counter accuracy (strip HTML, count plain text)
4. Test max length enforcement
5. Test AI toolbar integration (generate content → appears in editor)
6. Test save/load cycle (content persists after autosave)
7. Test CV preview renders formatted content correctly
8. Test keyboard shortcuts (Ctrl+B, Ctrl+I)
9. Test link insertion (add link, click link, remove link)
10. Test edge cases: empty editor, pasting rich text, very long content
