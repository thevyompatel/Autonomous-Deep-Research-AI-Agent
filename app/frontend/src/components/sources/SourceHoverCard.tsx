import { ExternalLink } from "lucide-react";
import { SourceAvatar, SourceNumber } from "@/components/common/SourceBits";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { STATUS_HELP, STATUS_LABEL, safeHref, type SourceItem } from "@/lib/sources";

const STATUS_VARIANT = { scraped: "success", fallback: "warning", failed: "danger", unknown: "muted" } as const;

/** The body of a source preview: used by citation hover cards. */
export function SourceCardBody({ source, citedIn }: { source: SourceItem; citedIn?: string[] }) {
  const href = safeHref(source.url);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SourceAvatar domain={source.domain} />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{source.domain}</span>
        <SourceNumber n={source.n} />
      </div>
      <p className="font-medium leading-snug [overflow-wrap:anywhere]">{source.title}</p>
      {source.snippet && <p className="line-clamp-3 text-sm text-muted-foreground">{source.snippet}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[source.status]} title={STATUS_HELP[source.status]}>
          {STATUS_LABEL[source.status]}
        </Badge>
        {citedIn && citedIn.length > 0 && (
          <span className="text-xs text-muted-foreground">Cited in {citedIn.join(", ")}</span>
        )}
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "sm" }), "w-full")}
        >
          <ExternalLink /> Open source
        </a>
      )}
    </div>
  );
}
