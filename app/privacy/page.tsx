import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi dan pengelolaan data pengguna Zyvo.",
};

export default function PrivacyPage() {
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
          Kebijakan Privasi
        </h1>
        <p className="text-sm text-muted-foreground">
          Terakhir diperbarui: 26 Juli 2026
        </p>

        <section className="mt-8 space-y-6 text-sm leading-7 text-foreground/90">
          <div>
            <h2 className="text-lg font-medium">1. Data yang Kami Kumpulkan</h2>
            <p className="mt-2">
              Kami mengumpulkan data yang Anda berikan secara langsung, seperti
              nama, alamat email, dan isi CV yang Anda buat. Kami juga
              mengumpulkan data teknis dasar untuk menjaga layanan tetap
              berjalan dengan aman.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">
              2. Cara Kami Menggunakan Data
            </h2>
            <p className="mt-2">
              Data digunakan untuk menyediakan dan meningkatkan layanan,
              menyimpan CV Anda, memproses fitur berbasis AI, serta menjaga
              keamanan akun Anda.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">3. Berbagi Data</h2>
            <p className="mt-2">
              Kami tidak menjual data pribadi Anda. Data hanya dibagikan kepada
              penyedia layanan tepercaya yang membantu operasional Zyvo, sesuai
              kebutuhan dan dengan perlindungan yang wajar.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">
              4. Penyimpanan &amp; Keamanan
            </h2>
            <p className="mt-2">
              Kami menerapkan langkah-langkah keamanan yang wajar untuk
              melindungi data Anda. Namun, tidak ada metode transmisi atau
              penyimpanan yang sepenuhnya aman secara mutlak.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">5. Hak Anda</h2>
            <p className="mt-2">
              Anda dapat mengakses, memperbarui, atau menghapus data akun dan CV
              Anda kapan saja melalui pengaturan akun atau dengan menghubungi
              kami.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-medium">6. Perubahan Kebijakan</h2>
            <p className="mt-2">
              Kebijakan Privasi ini dapat diperbarui sewaktu-waktu. Versi
              terbaru akan selalu tersedia di halaman ini.
            </p>
          </div>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          Baca juga{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Syarat &amp; Ketentuan
          </Link>{" "}
          kami.
        </p>
      </article>
    </div>
  );
}
