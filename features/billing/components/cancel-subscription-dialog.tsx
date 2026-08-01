"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
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
            className="text-destructive hover:text-destructive"
          >
            Batalkan Langganan
          </Button>
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan Langganan?</AlertDialogTitle>
          <AlertDialogDescription>
            Paket {PLAN_LABELS[plan]} kamu akan langsung berakhir. Akses fitur
            premium hilang seketika dan kamu turun ke paket Gratis.
            {plan === "pro" &&
              " Kamu berhak garansi uang kembali 7 hari — hubungi tim support kami untuk proses refund."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Kembali</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            loading={cancel.isPending}
            loadingText="Membatalkan…"
            className="rounded-full bg-destructive px-6 text-white hover:bg-destructive/80"
          >
            Batalkan Langganan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
