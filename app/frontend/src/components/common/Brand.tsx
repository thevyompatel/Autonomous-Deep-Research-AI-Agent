import { Telescope } from "lucide-react";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-white shadow-sm dark:to-violet-400 dark:text-zinc-950",
        className,
      )}
    >
      <Telescope className="size-[18px]" strokeWidth={2.2} />
    </span>
  );
}

/** Stacked-documents illustration for empty states. Inline so it works offline. */
export function EmptyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" className={cn("h-20 w-auto", className)} aria-hidden>
      <rect x="30" y="14" width="56" height="68" rx="8" className="fill-muted stroke-border" strokeWidth="1.5" />
      <rect x="22" y="8" width="56" height="68" rx="8" className="fill-card stroke-border" strokeWidth="1.5" />
      <rect x="32" y="22" width="30" height="5" rx="2.5" className="fill-primary/30" />
      <rect x="32" y="34" width="36" height="3.5" rx="1.75" className="fill-muted-foreground/25" />
      <rect x="32" y="42" width="32" height="3.5" rx="1.75" className="fill-muted-foreground/25" />
      <rect x="32" y="50" width="34" height="3.5" rx="1.75" className="fill-muted-foreground/25" />
      <circle cx="84" cy="62" r="12" className="fill-background stroke-primary" strokeWidth="2" />
      <path d="M92.5 70.5l7 7" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
