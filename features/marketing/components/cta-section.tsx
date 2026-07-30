import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { ShaderHero } from "./shader-hero";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-28">
      <Reveal className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-black px-6 py-24 text-center shadow-2xl shadow-indigo-950/40">
        <div className="absolute inset-0 -z-10">
          <ShaderHero />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>

        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Siap membuat CV yang membuka pintu?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg leading-8 text-white/70">
          Bergabunglah dengan ribuan pencari kerja yang menyusun CV profesional
          bersama Zyvo — gratis, cepat, dan ramah ATS.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "group h-11 gap-2 bg-white px-6 text-sm text-zinc-900 hover:bg-white/90",
            )}
          >
            Mulai Sekarang — Gratis
            <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/signin"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 border-white/20 bg-white/5 px-6 text-sm text-white backdrop-blur hover:bg-white/10 hover:text-white",
            )}
          >
            Masuk
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
