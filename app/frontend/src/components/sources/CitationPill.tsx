import { memo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { SourceCardBody } from "@/components/sources/SourceHoverCard";
import { cn } from "@/lib/cn";
import type { SourceItem } from "@/lib/sources";
import { useUiStore } from "@/store/uiStore";

const pill =
  "mx-px inline-flex h-[1.35em] min-w-[1.5em] items-center justify-center rounded px-[0.3em] align-[0.35em] font-sans text-[0.62em] font-semibold leading-none tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:min-w-[2em]";

interface CitationPillProps {
  n: number;
  source: SourceItem | undefined;
  citedIn?: string[];
  onCite?: (n: number) => void;
}

/** One [n] citation: a small accent pill with a source preview on hover or focus. */
export const CitationPill = memo(function CitationPill({ n, source, citedIn, onCite }: CitationPillProps) {
  const highlighted = useUiStore((s) => s.highlightedSource === n);

  if (!source) {
    return (
      <SimpleTooltip content={`Source ${n} is not in the Sources list, so this citation cannot be checked.`}>
        <button
          type="button"
          data-cite-n={n}
          className={cn(pill, "cursor-help bg-muted text-muted-foreground line-through")}
          aria-label={`Citation ${n}: no matching source`}
        >
          {n}
        </button>
      </SimpleTooltip>
    );
  }

  return (
    <HoverCard openDelay={150} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          data-cite-n={n}
          onClick={() => onCite?.(n)}
          aria-label={`Source ${n}: ${source.title}`}
          className={cn(
            pill,
            "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
            highlighted && "bg-primary text-primary-foreground ring-2 ring-primary/40",
          )}
        >
          {n}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80">
        <SourceCardBody source={source} citedIn={citedIn} />
      </HoverCardContent>
    </HoverCard>
  );
});

interface CitationGroupProps {
  numbers: number[];
  trail: string;
  sources: ReadonlyMap<number, SourceItem>;
  citedIn?: ReadonlyMap<number, string[]>;
  onCite?: (n: number) => void;
}

/** Adjacent citations, kept on one line with any punctuation that follows them. */
export function CitationGroup({ numbers, trail, sources, citedIn, onCite }: CitationGroupProps) {
  return (
    <span className="whitespace-nowrap">
      <sup className="top-0 align-baseline text-[1em]">
        {numbers.map((n) => (
          <CitationPill key={n} n={n} source={sources.get(n)} citedIn={citedIn?.get(n)} onCite={onCite} />
        ))}
      </sup>
      {trail}
    </span>
  );
}
