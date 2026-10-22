import { Gauge } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useStatus } from "@/hooks/useUsage";
import { cn } from "@/lib/cn";

/** Green when the Python server answers /api/status, red when it does not. */
export function BackendDot({ withLabel }: { withLabel?: boolean }) {
  const { isError, isSuccess } = useStatus();
  const label = isError ? "Server unreachable" : isSuccess ? "Server online" : "Checking server";
  const dot = (
    <span
      role="img"
      aria-label={label}
      tabIndex={withLabel ? undefined : 0}
      className="inline-flex items-center gap-2 rounded text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          isError ? "bg-destructive" : isSuccess ? "bg-success" : "bg-muted-foreground/40",
        )}
      />
      {withLabel && label}
    </span>
  );
  return withLabel ? dot : <SimpleTooltip content={label}>{dot}</SimpleTooltip>;
}

/** Today's Gemini request count, with a bar when a daily cap is configured. */
export function UsageMeter({ compact }: { compact?: boolean }) {
  const { data } = useStatus();
  const usage = data?.usage;
  if (!usage) return null;
  const capped = usage.cap > 0;
  const ratio = capped ? Math.min(1, usage.used / usage.cap) : 0;
  const tone = !capped ? "bg-primary" : ratio >= 1 ? "bg-destructive" : ratio >= 0.75 ? "bg-warning" : "bg-success";
  const label = capped ? `${usage.used} of ${usage.cap} Gemini requests used today` : `${usage.used} Gemini requests today`;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          "w-full rounded-lg text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "inline-flex items-center gap-1.5 px-2 py-1" : "block px-2 py-2",
        )}
      >
        {compact ? (
          <>
            <Gauge className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-mono text-sm tabular-nums">
              {usage.used}
              {capped && <span className="text-muted-foreground">/{usage.cap}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Gemini today</span>
              <span className="font-mono tabular-nums text-foreground">
                {usage.used}
                {capped && <span className="text-muted-foreground"> / {usage.cap}</span>}
              </span>
            </span>
            {capped && (
              <Progress value={ratio * 100} className="mt-1.5" indicatorClassName={tone} aria-label={label} />
            )}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 text-sm">
        <p className="font-medium">{label}</p>
        <p className="mt-1.5 text-muted-foreground">
          One research run uses about 3 to 10 requests. The client also stays under{" "}
          {data.requests_per_minute} requests per minute.
          {capped && " The daily cap resets at midnight Pacific time; change LLM_REQUESTS_PER_DAY in .env."}
        </p>
      </PopoverContent>
    </Popover>
  );
}
