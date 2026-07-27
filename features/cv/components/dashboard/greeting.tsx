"use client";

import { useEffect, useState } from "react";

/** Map a 24h hour to an Indonesian time-of-day greeting word. */
function greetingWord(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

/**
 * Time-aware greeting. Renders a neutral word first, then refines it on the
 * client after mount — the local time-of-day can't be known server-side without
 * risking a hydration mismatch.
 */
export function Greeting({ name }: { name: string }) {
  const [word, setWord] = useState("Selamat datang");

  useEffect(() => {
    setWord(greetingWord(new Date().getHours()));
  }, []);

  const displayName = name.trim() || "Pengguna";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {word}, {displayName} 👋
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola CV Anda, jelajahi template, dan buat lamaran yang menonjol.
      </p>
    </div>
  );
}
