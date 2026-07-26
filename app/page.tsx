import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-zinc-50 to-white font-sans dark:from-zinc-950 dark:to-black">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <BrandLogo />
        <Link
          href="/signin"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Masuk
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <span className="rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
          ✨ Didukung AI
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-black sm:text-5xl dark:text-zinc-50">
          Buat CV profesional dengan bantuan AI
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Zyvo membantu Anda menyusun CV yang rapi, ramah ATS, dan siap kirim —
          cukup isi datanya, pilih template, lalu unduh.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            Mulai Sekarang
          </Link>
          <Link
            href="/signin"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Masuk
          </Link>
        </div>
      </main>
    </div>
  );
}
