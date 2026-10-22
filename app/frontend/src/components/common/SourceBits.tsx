import { Circle, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { STATUS_HELP, STATUS_LABEL, type SourceStatus } from "@/lib/sources";

function hue(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Letter avatar instead of a remote favicon, so the UI makes no third-party requests. */
export function SourceAvatar({ domain, className }: { domain: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold uppercase text-white",
        className,
      )}
      style={{ backgroundColor: `hsl(${hue(domain)} 52% 44%)` }}
    >
      {(domain || "?").charAt(0)}
    </span>
  );
}

const STATUS_ICON = {
  scraped: { Icon: CircleCheck, className: "text-success" },
  fallback: { Icon: TriangleAlert, className: "text-warning" },
  failed: { Icon: CircleX, className: "text-destructive" },
  unknown: { Icon: Circle, className: "text-muted-foreground/60" },
} as const;

/** Scrape-status icon with a tooltip and screen-reader text (never colour alone). */
export function SourceStatusIcon({ status, className }: { status: SourceStatus; className?: string }) {
  const { Icon, className: tone } = STATUS_ICON[status];
  return (
    <SimpleTooltip content={STATUS_HELP[status]}>
      <span tabIndex={0} className={cn("inline-flex rounded focus-visible:ring-2 focus-visible:ring-ring", className)}>
        <Icon className={cn("size-4", tone)} aria-hidden />
        <span className="sr-only">{STATUS_LABEL[status]}</span>
      </span>
    </SimpleTooltip>
  );
}

export function SourceNumber({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-7 shrink-0 items-center justify-center rounded bg-primary/10 px-1 font-mono text-xs font-medium text-primary",
        className,
      )}
    >
      [{n}]
    </span>
  );
}
