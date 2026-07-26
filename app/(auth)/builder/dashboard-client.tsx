"use client";

import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export function DashboardClient() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: cvs, isLoading } = trpc.cv.list.useQuery();

  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => router.push(`/builder/${cv.id}`),
  });
  const deleteMutation = trpc.cv.delete.useMutation({
    onSuccess: () => utils.cv.list.invalidate(),
  });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your CVs</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and manage your resumes.
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate(undefined)}
          loading={createMutation.isPending}
        >
          <PlusIcon /> New CV
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : cvs && cvs.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {cvs.map((cv) => (
            <Card
              key={cv.id}
              className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => router.push(`/builder/${cv.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <CardTitle className="truncate">{cv.title}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete CV"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: cv.id });
                    }}
                  >
                    <Trash2Icon className="text-muted-foreground" />
                  </Button>
                </div>
                <CardDescription>
                  Updated {new Date(cv.updatedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileTextIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No CVs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first CV to get started.
          </p>
          <Button
            className="mt-4"
            onClick={() => createMutation.mutate(undefined)}
            loading={createMutation.isPending}
          >
            <PlusIcon /> New CV
          </Button>
        </div>
      )}
    </div>
  );
}
