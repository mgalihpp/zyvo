"use client";

import {
  CheckIcon,
  CircleAlertIcon,
  LoaderIcon,
  PencilIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SaveStatus } from "@/features/cv/stores/cv-store";
import { cn } from "@/lib/utils";

export interface EditableTitleProps {
  /** Current title. */
  value: string;
  /** Called with the trimmed, changed, non-empty title. */
  onCommit: (next: string) => void;
  /** Drives the inline save indicator next to the title. */
  status?: SaveStatus;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  /** Typography/size classes applied to BOTH the display text and the input
   *  so the swap between them is seamless. */
  className?: string;
  /** Show the faint pencil affordance on hover (default true). */
  showEditIcon?: boolean;
}

function StatusIcon({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saving":
      return (
        <LoaderIcon
          aria-label="Menyimpan"
          className="size-3.5 shrink-0 animate-spin text-muted-foreground"
        />
      );
    case "saved":
      return (
        <CheckIcon
          aria-label="Tersimpan"
          className="size-3.5 shrink-0 text-green-600 dark:text-green-500"
        />
      );
    case "error":
      return (
        <CircleAlertIcon
          aria-label="Gagal menyimpan"
          className="size-3.5 shrink-0 text-destructive"
        />
      );
    default:
      return null;
  }
}

/**
 * Click-to-edit title. Renders as plain text with a faint pencil affordance;
 * clicking swaps to an inline input (Enter/blur = save, Escape = cancel,
 * empty/unchanged = revert). A subtle save indicator sits next to the title,
 * driven by the `status` prop. Purely presentational — the caller decides how
 * to persist via `onCommit` and how to compute `status`.
 */
export function EditableTitle({
  value,
  onCommit,
  status = "idle",
  maxLength = 160,
  placeholder = "Untitled CV",
  ariaLabel = "Ubah judul",
  className,
  showEditIcon = true,
}: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync the draft when the external value changes while not editing (autosave,
  // switching CVs). Never clobber an in-progress edit.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Focus + select on entering edit mode (avoids the autoFocus a11y lint).
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === value.trim()) {
      setDraft(value);
      return;
    }
    onCommit(next);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={cn(
            "-mx-1 min-w-0 flex-1 rounded-sm bg-transparent px-1 outline-none ring-1 ring-primary/50 focus:ring-2 focus:ring-primary/60",
            className,
          )}
        />
        <StatusIcon status={status} />
      </span>
    );
  }

  return (
    <span className="group/title flex min-w-0 items-center gap-1.5">
      {/* Full-width click target: clicking anywhere on the row (not just the
          text) starts editing. Pencil affordance lives inside the button. */}
      <button
        type="button"
        aria-label={ariaLabel}
        title={value?.trim() || placeholder}
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left",
          className,
        )}
      >
        <span className="min-w-0 truncate">{value?.trim() || placeholder}</span>
        {showEditIcon ? (
          <PencilIcon
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-70"
          />
        ) : null}
      </button>
      <StatusIcon status={status} />
    </span>
  );
}
