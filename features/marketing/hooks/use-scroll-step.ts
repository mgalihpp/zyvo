"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function stepIndexForProgress(progress: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}

export function useScrollStep(count: number) {
  const ref = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || count <= 1) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const viewport = window.innerHeight;
      const usable = Math.max(1, el.offsetHeight - viewport);
      const progress = Math.min(
        1,
        Math.max(0, -el.getBoundingClientRect().top / usable),
      );
      setIndex(stepIndexForProgress(progress, count));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [count]);

  const scrollToStep = useCallback(
    (step: number) => {
      const el = ref.current;
      if (!el) return;
      const viewport = window.innerHeight;
      const usable = Math.max(1, el.offsetHeight - viewport);
      const sectionTop = el.getBoundingClientRect().top + window.scrollY;
      const target = sectionTop + (step / count) * usable;
      window.scrollTo({ top: target, behavior: "smooth" });
    },
    [count],
  );

  return { ref, index, scrollToStep };
}
