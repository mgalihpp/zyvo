"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals its children with a fade-and-rise animation the first time it scrolls
 * into view. Uses IntersectionObserver and unobserves after the first trigger,
 * so the animation plays once. Reduced-motion is handled in CSS.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}
