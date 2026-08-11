"use client";

import { ArrowRightIcon, SparklesIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/lib/auth-client";
import { useMounted } from "@/features/auth/lib/use-mounted";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { ShaderHero } from "./shader-hero";

export function Hero() {
  const mounted = useMounted();
  const { data: session, isPending } = useSession();
  const authed = mounted && !isPending && !!session;
  const panelRef = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.MouseEvent) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${y * -14}deg)`;
  };
  const handleLeave = () => {
    if (panelRef.current) panelRef.current.style.transform = "";
  };
  return (
    <section className="relative isolate overflow-hidden bg-black">
      <div className="absolute inset-0 -z-10">
        <ShaderHero />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-24 pt-36 text-center sm:pt-44">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 shadow-sm backdrop-blur">
            <SparklesIcon className="size-3.5 text-indigo-300" />
            Didukung AI
          </span>
        </Reveal>

        <Reveal
          as="h1"
          delay={80}
          className="reveal mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl"
        >
          Buat CV profesional
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
            {" "}
            dalam hitungan menit
          </span>
        </Reveal>

        <Reveal
          as="p"
          delay={160}
          className="reveal mt-6 max-w-xl text-balance text-lg leading-8 text-white/70"
        >
          Zyvo membantu Anda menyusun CV yang rapi, ramah ATS, dan siap kirim —
          cukup isi datanya, pilih template, lalu unduh.
        </Reveal>

        <Reveal delay={240} className="mt-9 flex flex-col gap-3 sm:flex-row">
          {!mounted || isPending ? (
            <>
              <Skeleton className="h-11 w-52 rounded-md" />
              <Skeleton className="h-11 w-24 rounded-md" />
            </>
          ) : (
            <>
              <Link
                href={authed ? "/dashboard" : "/signup"}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "group h-11 gap-2 bg-white px-6 text-sm text-zinc-900 shadow-lg shadow-indigo-950/30 transition-transform hover:-translate-y-0.5 hover:bg-white/90",
                )}
              >
                {authed ? "Ke Dashboard" : "Mulai Sekarang — Gratis"}
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!authed && (
                <Link
                  href="/signin"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-11 border-white/20 bg-white/5 px-6 text-sm text-white backdrop-blur hover:bg-white/10 hover:text-white",
                  )}
                >
                  Masuk
                </Link>
              )}
            </>
          )}
        </Reveal>

        <Reveal
          delay={320}
          className="mt-6 flex items-center gap-2 text-xs text-white/50"
        >
          <span className="flex items-center gap-0.5 text-amber-300">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} className="size-3.5 fill-current" />
            ))}
          </span>
          Tanpa kartu kredit • Ekspor PDF instan
        </Reveal>

        <Reveal
          delay={420}
          className="relative mt-16 w-full max-w-5xl [perspective:1200px]"
        >
          <div
            ref={panelRef}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            className="relative overflow-hidden rounded-4xl border border-white/15 bg-white/5 p-4 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform [transform-style:preserve-3d]"
          >
            <div className="overflow-hidden rounded-xl">
              <Image
                src="/hero.png"
                alt="Pratinjau editor Zyvo"
                width={1600}
                height={1000}
                priority
                className="w-full"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/15"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
