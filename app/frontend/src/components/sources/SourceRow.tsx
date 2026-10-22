import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { SourceAvatar, SourceNumber, SourceStatusIcon } from "@/components/common/SourceBits";
import { cn } from "@/lib/cn";
import { safeHref, type SourceItem } from "@/lib/sources";

interface SourceRowProps {
  source: SourceItem;
  onSelect?: (n: number) => void;
  flash?: boolean;
  highlighted?: boolean;
  compact?: boolean;
}

export const SourceRow = memo(function SourceRow({ source, onSelect, flash, highlighted, compact }: SourceRowProps) {
  const href = safeHref(source.url);
  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60",
        flash && "animate-flash",
        highlighted && "bg-primary/10",
      )}
    >
      <SourceAvatar domain={source.domain} className="mt-0.5" />
      <button
        type="button"
        onClick={() => onSelect?.(source.n)}
        className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={source.title}
      >
        <span className={cn("block font-medium leading-snug [overflow-wrap:anywhere]", compact ? "line-clamp-1" : "line-clamp-2")}>
          {source.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <SourceNumber n={source.n} className="h-4 min-w-6 text-[11px]" />
          <span className="truncate font-mono">{source.domain}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <SourceStatusIcon status={source.status} />
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open source ${source.n} in a new tab`}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:p-2.5"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
});
