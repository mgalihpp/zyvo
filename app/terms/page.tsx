import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan layanan Zyvo.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 md:flex-row md:gap-12">
      <aside className="md:w-48 md:shrink-0">
        <div className="flex flex-col gap-6 md:sticky md:top-12">
          <BackButton className="-ml-2 w-fit" />
          <Link href="/" className="inline-block">
            <BrandLogo width={96} height={32} />
          </Link>
        </div>
      </aside>

      <article className="prose prose-zinc max-w-2xl flex-1 dark:prose-invert">
        <h1 className="text-3xl font-semibold tracking-tight">
          Syarat &amp; Ketentuan
        </h1>
        <p className="text-sm text-muted-foreground">
          Terakhir diperbarui: 26 Juli 2026
        </p>

        <section className="mt-8 space-y-6 text-sm leading-7 text-foreground/90">
          <div>
            <h2 className="text-lg font-medium">1. Penerimaan Ketentuan</h2>
            <p className="mt-2">
              Dengan membuat akun atau menggunakan layanan Zyvo, Anda menyetujui
              untuk terikat oleh Syarat &amp; Ketentuan ini. Jika Anda tidak
              menyetujuinya, mohon untuk tidak menggunakan layanan kami.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">2. Penggunaan Layanan</h2>
            <p className="mt-2">
              Zyvo menyediakan alat untuk membuat, menyunting, dan mengunduh CV
              dengan bantuan AI. Anda bertanggung jawab atas keakuratan data
              yang Anda masukkan dan penggunaan hasil yang Anda buat.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">3. Akun Pengguna</h2>
            <p className="mt-2">
              Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda
              serta seluruh aktivitas yang terjadi di dalam akun tersebut.
              Segera beri tahu kami jika terjadi penggunaan tanpa izin.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">4. Konten Anda</h2>
            <p className="mt-2">
              Anda tetap memiliki hak penuh atas data dan konten CV yang Anda
              buat. Anda memberikan Zyvo izin terbatas untuk memproses data
              tersebut semata-mata untuk menyediakan layanan kepada Anda.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">5. Pembatasan</h2>
            <p className="mt-2">
              Anda setuju untuk tidak menyalahgunakan layanan, termasuk mencoba
              mengakses sistem tanpa izin, mengganggu operasional, atau
              menggunakan layanan untuk tujuan melanggar hukum.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">6. Perubahan Ketentuan</h2>
            <p className="mt-2">
              Kami dapat memperbarui Syarat &amp; Ketentuan ini dari waktu ke
              waktu. Perubahan berlaku setelah dipublikasikan pada halaman ini.
            </p>
          </div>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          Baca juga{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Kebijakan Privasi
          </Link>{" "}
          kami.
        </p>
      </article>
    </div>
  );
}
