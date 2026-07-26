"use client";

import {
  CheckIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signOut, useSession } from "@/lib/auth-client";
import { useCvStore } from "@/lib/stores/cv-store";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

/** Minimal user shape resolved on the server and used for the header. */
export interface BuilderUser {
  name: string;
  email: string;
  image: string | null;
}

/**
 * Sticky top bar for the editor column. Shows the user avatar, name, and the
 * current CV title as a trigger for the "Pilih CV" dialog, plus a sign-out
 * button.
 */
export function PanelTopBar({ initialUser }: { initialUser: BuilderUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  const { data: session } = useSession();
  const title = useCvStore((s) => s.title);
  const utils = trpc.useUtils();

  // Prefer the live client session, but fall back to the server-provided user
  // so the header renders the real name/avatar on the first paint (no flicker
  // through the "Pengguna" placeholder). `useSession` keeps it reactive, e.g.
  // after the account name changes.
  const user = session?.user ?? initialUser;
  const displayName = user?.name?.trim() || user?.email || "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();

  // Warm the CV list before the switcher opens so the dialog shows data
  // immediately instead of its spinner.
  const prefetchCvs = () => utils.cv.list.prefetch();

  function handleSignOut() {
    startSignOut(async () => {
      await signOut();
      router.push("/signin");
      router.refresh();
    });
  }

  return (
    <div className="sticky top-0 z-20 flex items-center gap-1 border-b bg-background/95 px-2 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button
              type="button"
              onMouseEnter={prefetchCvs}
              onFocus={prefetchCvs}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
            />
          }
        >
          {user?.image ? (
            // biome-ignore lint/performance/noImgElement: small avatar from auth provider
            <img
              src={user.image}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground shadow-sm">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {displayName}
            </p>
            <p className="truncate text-xs font-medium text-primary">
              {title?.trim() || "Untitled CV"}
            </p>
          </div>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </DialogTrigger>

        <CvSwitcherDialog onClose={() => setOpen(false)} />
      </Dialog>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Keluar"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {signingOut ? (
          <Spinner className="size-4" />
        ) : (
          <LogOutIcon className="size-4" />
        )}
      </button>
    </div>
  );
}

function CvSwitcherDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const activeCvId = useCvStore((s) => s.cvId);
  const storeTitle = useCvStore((s) => s.title);
  const setStoreTitle = useCvStore((s) => s.setTitle);

  const utils = trpc.useUtils();
  const { data: cvs, isLoading } = trpc.cv.list.useQuery();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const renameMutation = trpc.cv.update.useMutation({
    onSuccess: () => utils.cv.list.invalidate(),
  });
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: async (cv) => {
      // Refresh the CV list so the switcher and dashboard reflect the new CV
      // immediately, then navigate into the freshly created editor.
      await utils.cv.list.invalidate();
      onClose();
      router.push(`/builder/${cv.id}`);
    },
  });

  function startRename(id: string, current: string) {
    setEditingId(id);
    setDraftName(current);
  }

  function commitRename(id: string) {
    const name = draftName.trim();
    setEditingId(null);
    if (!name) return;
    // Keep the live store in sync when renaming the CV we're editing.
    if (id === activeCvId && name !== storeTitle) setStoreTitle(name);
    renameMutation.mutate({ id, data: { title: name } });
  }

  function switchTo(id: string) {
    onClose();
    if (id !== activeCvId) router.push(`/builder/${id}`);
  }

  return (
    <DialogContent className="sm:max-w-md" scrollable>
      <DialogHeader>
        <DialogTitle>Pilih CV</DialogTitle>
      </DialogHeader>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {cvs?.map((cv) => {
            const isActive = cv.id === activeCvId;
            // The active CV reflects the live (possibly-unsaved) store title.
            const label = isActive ? storeTitle || cv.title : cv.title;
            const isEditing = editingId === cv.id;

            return (
              <div
                key={cv.id}
                className={cn(
                  "group/item flex items-center gap-3 rounded-lg border p-3 transition-all",
                  isActive
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {isActive ? <CheckIcon className="size-3" /> : null}
                </span>

                <button
                  type="button"
                  onClick={() => switchTo(cv.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={draftName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => commitRename(cv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(cv.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="mt-1 h-7 text-sm"
                    />
                  ) : (
                    <>
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold",
                          isActive ? "text-primary" : "text-foreground",
                        )}
                      >
                        {label || "Untitled CV"}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {isActive ? "Sedang dibuka · " : ""}
                        Diperbarui{" "}
                        {new Date(cv.updatedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </button>

                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => startRename(cv.id, label)}
                    aria-label="Ubah nama"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover/item:opacity-100"
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={() => createMutation.mutate(undefined)}
            loading={createMutation.isPending}
          >
            <PlusIcon data-icon="inline-start" />
            Buat CV Baru
          </Button>
        </div>
      )}
    </DialogContent>
  );
}
