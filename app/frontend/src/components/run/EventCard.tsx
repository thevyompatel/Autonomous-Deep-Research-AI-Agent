import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/cn";
import { formatOffset } from "@/lib/format";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

const BORDER: Partial<Record<Tone, string>> = {
  warning: "border-warning/30",
  danger: "border-destructive/30",
};

interface EventCardProps {
  icon: LucideIcon;
  tone?: Tone;
  title: ReactNode;
  meta?: ReactNode;
  /** Seconds since the job started. */
  t?: number;
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
}

/** Shell for every timeline event: icon, title, "+12s" and a collapsible body. */
export function EventCard({ icon: Icon, tone = "neutral", title, meta, t, defaultOpen = true, children, className }: EventCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const header = (
    <>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", TONE[tone])} aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-snug">{title}</span>
        {meta && <span className="mt-0.5 block text-sm text-muted-foreground">{meta}</span>}
      </span>
      {t !== undefined && (
        <span className="shrink-0 font-mono text-xs text-muted-foreground" title="Time since the run started">
          {formatOffset(t)}
        </span>
      )}
    </>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded-xl border bg-card", BORDER[tone], className)}>
        {children ? (
          <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {header}
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3">{header}</div>
        )}
        {children && (
          <CollapsibleContent>
            <div className="px-4 pb-4 md:pl-[3.75rem]">{children}</div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
