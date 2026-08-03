"use client";

import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { stripHtml } from "@/lib/html";
import { cn } from "@/lib/utils";

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
      className="flex h-7 w-7 items-center justify-center rounded text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function RichToolbar({ editor }: { editor: Editor }) {
  if (!editor) return null;

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
      <ToolbarButton
        label="Tebal"
        active={editor.isActive("bold")}
        onMouseDown={run(() => editor.chain().focus().toggleBold().run())}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Miring"
        active={editor.isActive("italic")}
        onMouseDown={run(() => editor.chain().focus().toggleItalic().run())}
      >
        <em>I</em>
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Poin"
        active={editor.isActive("bulletList")}
        onMouseDown={run(() => editor.chain().focus().toggleBulletList().run())}
      >
        <span>•</span>
      </ToolbarButton>
    </div>
  );
}

export function RichTextarea({
  value,
  onChange,
  maxLength = 2000,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        orderedList: false,
      }),
    ],
    content: value,
    onUpdate({ editor: editorInstance }) {
      onChange(editorInstance.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  const count = stripHtml(value).length;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="overflow-hidden rounded-md border border-input">
        <RichToolbar editor={editor} />
        <div className="tiptap">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="flex items-center justify-end px-2 py-1 text-xs text-muted-foreground">
        <span
          className={
            count > maxLength ? "font-medium text-destructive" : undefined
          }
        >
          {count}/{maxLength}
        </span>
      </div>
    </div>
  );
}
