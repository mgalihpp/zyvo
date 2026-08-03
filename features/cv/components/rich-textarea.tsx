"use client";

import { Link as LinkExt } from "@tiptap/extension-link";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  if (!editor) return null;

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };

  const openLink = () => {
    setUrl(editor.getAttributes("link").href ?? "");
    setOpen(true);
  };

  const applyLink = () => {
    if (url.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setOpen(false);
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
        label="Subjudul"
        active={editor.isActive("heading", { level: 2 })}
        onMouseDown={run(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Sub-subjudul"
        active={editor.isActive("heading", { level: 3 })}
        onMouseDown={run(() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
      >
        H3
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Poin"
        active={editor.isActive("bulletList")}
        onMouseDown={run(() => editor.chain().focus().toggleBulletList().run())}
      >
        <span>•</span>
      </ToolbarButton>
      <ToolbarButton
        label="Nomor"
        active={editor.isActive("orderedList")}
        onMouseDown={run(() =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
      >
        <span>1.</span>
      </ToolbarButton>
      <span aria-hidden className="mx-1 h-4 w-px bg-border" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <ToolbarButton
              label="Link"
              active={editor.isActive("link")}
              onMouseDown={(e) => {
                e.preventDefault();
                openLink();
              }}
            >
              🔗
            </ToolbarButton>
          }
        />
        <PopoverContent className="w-72 p-3">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              {editor.isActive("link") ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .extendMarkRange("link")
                      .unsetLink()
                      .run();
                    setOpen(false);
                  }}
                >
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
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input",
        className,
      )}
    >
      <RichToolbar editor={editor} />
      <div className="tiptap">
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1 text-xs text-muted-foreground">
        {placeholder ? (
          <span className="mr-auto truncate text-muted-foreground/70">
            {placeholder}
          </span>
        ) : null}
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
