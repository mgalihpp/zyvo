import Image from "next/image";
import { cn } from "@/lib/utils";

/** Zyvo brand mark. The logo already includes the wordmark. */
export function BrandLogo({
  className,
  width = 96,
  height = 32,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src="/zyvo.png"
      alt="Zyvo"
      width={width}
      height={height}
      priority
      className={cn("h-8 w-auto max-w-32 object-contain", className)}
    />
  );
}
