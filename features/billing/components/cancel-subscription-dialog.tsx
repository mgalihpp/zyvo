"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCancelSubscription } from "@/features/billing/hooks/use-billing";

const PLAN_LABELS = { basic: "Basic", pro: "Pro" } as const;

export default function CancelSubscriptionDialog({
  plan,
  onCanceled,
}: {
  plan: "basic" | "pro";
  onCanceled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cancel = useCancelSubscription();

  const handleConfirm = async () => {
    await cancel.mutateAsync(undefined);
    setOpen(false);
    onCanceled();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive hover:border-destructive hover:text-white"
          >
            Batalkan Langganan
          </Button>
        }
      />
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <CircleAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Batalkan Langganan?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block">
              Paket {PLAN_LABELS[plan]} kamu akan langsung berakhir. Akses fitur
              premium hilang seketika dan kamu turun ke paket Gratis.
            </span>
            {plan === "pro" && (
              <span className="mt-2 block">
                Kamu berhak garansi uang kembali 7 hari — hubungi tim support
                kami untuk proses refund.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="w-full sm:w-auto">
            Kembali
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            loading={cancel.isPending}
            loadingText="Membatalkan…"
            className="w-full bg-destructive px-6 text-white hover:bg-destructive/80 sm:w-auto"
          >
            Batalkan Langganan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
