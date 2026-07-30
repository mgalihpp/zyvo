"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCancelTransaction,
  useCreateSnapToken,
  usePollStatus,
} from "@/features/billing/hooks/use-billing";
import type { Period, PlanId } from "@/features/billing/lib/plans";
import { PLANS } from "@/features/billing/lib/plans";

const POLL_LIMIT = 300; // 300 × 3s = 15 menit

const SNAP_VTWEB_BASE =
  process.env.NODE_ENV === "production"
    ? "https://app.midtrans.com/snap/v2/vtweb"
    : "https://app.sandbox.midtrans.com/snap/v2/vtweb";

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function PaymentModal({
  planId,
  period,
  open,
  onOpenChange,
  onSuccess,
}: {
  planId: PlanId;
  period: Period;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const plan = PLANS[planId];
  const amount = plan[period];

  const [orderId, setOrderId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollCount = useRef(0);

  const createToken = useCreateSnapToken();
  const cancel = useCancelTransaction();
  const { status, isPaid } = usePollStatus(orderId, polling);

  // Increment poll count setiap status berubah — `status` sengaja jadi dep
  // agar efek jalan tiap tick poll (bukan dep yang tak perlu).
  // biome-ignore lint/correctness/useExhaustiveDependencies: status drives the poll tick
  useEffect(() => {
    if (!polling || !orderId) return;
    pollCount.current += 1;
    if (pollCount.current >= POLL_LIMIT) {
      setPolling(false);
      setTimedOut(true);
    }
  }, [status, polling, orderId]);

  // Sukses
  useEffect(() => {
    if (isPaid) {
      setPolling(false);
      onSuccess();
      onOpenChange(false);
    }
  }, [isPaid, onSuccess, onOpenChange]);

  function reset() {
    setOrderId(null);
    setPolling(false);
    setTimedOut(false);
    pollCount.current = 0;
  }

  async function handlePay() {
    const result = await createToken.mutateAsync({ planId, period });
    setOrderId(result.orderId);

    if (!window.snap) {
      // Fallback redirect jika snap.js belum load
      window.location.href = `${SNAP_VTWEB_BASE}/${result.snapToken}`;
      return;
    }

    window.snap.pay(result.snapToken, {
      onSuccess: () => setPolling(true),
      onPending: () => setPolling(true),
      onError: () => setPolling(false),
      onClose: () => {
        // Customer tutup popup — order masih bisa dilanjutkan
        setPolling(true); // tetap poll untuk cek apakah sempat berhasil
      },
    });

    setPolling(true);
  }

  async function handleCancel() {
    if (orderId) await cancel.mutateAsync({ orderId });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Upgrade ke {plan.label} — {IDR.format(amount)}/
            {period === "yearly" ? "tahun" : "bulan"}
          </DialogTitle>
        </DialogHeader>

        {timedOut && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="text-sm text-destructive">
              Waktu pembayaran habis. Silakan coba lagi.
            </p>
            <Button variant="outline" onClick={reset}>
              Coba Lagi
            </Button>
          </div>
        )}

        {!timedOut && !orderId && (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Klik tombol di bawah untuk memilih metode pembayaran — GoPay,
              QRIS, kartu kredit, atau transfer bank.
            </p>
            <Button
              onClick={handlePay}
              disabled={createToken.isPending}
              className="w-full"
            >
              {createToken.isPending ? "Memuat..." : "Lanjutkan ke Pembayaran"}
            </Button>
            {createToken.isError && (
              <p className="text-center text-xs text-destructive">
                Gagal memuat pembayaran. Coba lagi.
              </p>
            )}
          </div>
        )}

        {!timedOut && orderId && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              Selesaikan pembayaran di jendela Midtrans yang terbuka. Halaman
              ini akan otomatis update setelah pembayaran berhasil.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={cancel.isPending}
            >
              Batalkan Transaksi
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
