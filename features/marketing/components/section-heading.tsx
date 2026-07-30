import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow ? (
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-balance text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
