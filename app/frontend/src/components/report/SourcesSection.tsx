import { memo } from "react";
import { ExternalLink } from "lucide-react";
import { SourceAvatar, SourceStatusIcon } from "@/components/common/SourceBits";
import { cn } from "@/lib/cn";
import { safeHref, type SourceItem } from "@/lib/sources";
import { useUiStore } from "@/store/uiStore";

const SourceEntry = memo(function SourceEntry({ source, citedIn }: { source: SourceItem; citedIn: string[] | undefined }) {
  const highlighted = useUiStore((s) => s.highlightedSource === source.n);
  const href = safeHref(source.url);
  return (
    <li
      id={`source-${source.n}`}
      className={cn("flex scroll-mt-36 gap-3 rounded-lg px-3 py-2.5 transition-colors", highlighted && "animate-flash bg-primary/10")}
    >
      <span className="w-7 shrink-0 pt-0.5 text-right font-mono text-sm text-muted-foreground">{source.n}.</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 font-medium text-foreground underline-offset-4 [overflow-wrap:anywhere] hover:text-primary hover:underline"
            >
              {source.title}
              <ExternalLink className="ml-1 inline size-3.5 -translate-y-px text-muted-foreground" aria-label="(opens in a new tab)" />
            </a>
          ) : (
            <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{source.title}</span>
          )}
          <SourceStatusIcon status={source.status} className="mt-0.5" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <SourceAvatar domain={source.domain} className="size-4 text-[9px]" />
          <span className="font-mono">{source.domain}</span>
          {citedIn && citedIn.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>Cited in: {citedIn.join(", ")}</span>
            </>
          )}
        </div>
      </div>
    </li>
  );
});

export function SourcesSection({ sources, citedIn }: { sources: SourceItem[]; citedIn: ReadonlyMap<number, string[]> }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="sources-title" className="mt-14 border-t pt-8">
      <h2 id="sources-title" className="scroll-mt-32 text-xl font-semibold tracking-tight">
        Sources
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Generated from the pages the agent read. Open them to verify each claim.</p>
      <ol className="mt-4 space-y-1">
        {sources.map((source) => (
          <SourceEntry key={source.n} source={source} citedIn={citedIn.get(source.n)} />
        ))}
      </ol>
    </section>
  );
}
