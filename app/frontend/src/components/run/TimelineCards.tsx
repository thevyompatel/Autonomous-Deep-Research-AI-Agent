import { lazy, memo, Suspense, useMemo, useState } from "react";
import {
  Ban,
  CircleCheck,
  CircleX,
  FileCheck2,
  Info,
  ListChecks,
  PenLine,
  Search,
  SearchCheck,
  TriangleAlert,
} from "lucide-react";
import type { Source } from "@/api/types";
import { SourceAvatar, SourceNumber, SourceStatusIcon } from "@/components/common/SourceBits";
import { EventCard } from "@/components/run/EventCard";
import { ScoreRing } from "@/components/run/ScoreRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { navigate } from "@/hooks/useHashRoute";
import { formatNumber, markdownPreview, plural } from "@/lib/format";
import type { DraftInfo, ReviewInfo } from "@/lib/runReducer";
import { fromRunSource, safeHref, type SourceItem } from "@/lib/sources";
import { useRunStore } from "@/store/runStore";

const MarkdownView = lazy(() => import("@/components/report/MarkdownView"));

function QueryChips({ queries }: { queries: string[] }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {queries.map((query, i) => (
        <li
          key={`${i}-${query}`}
          className="inline-flex max-w-full items-center gap-2 rounded-lg border bg-background py-1 pl-1 pr-2.5"
        >
          <span className="grid size-5 shrink-0 place-items-center rounded bg-muted font-mono text-[11px] text-muted-foreground">
            {i + 1}
          </span>
          <span className="min-w-0 font-mono text-sm [overflow-wrap:anywhere]">{query}</span>
        </li>
      ))}
    </ol>
  );
}

export const PlanCard = memo(function PlanCard({ queries, t }: { queries: string[]; t: number }) {
  return (
    <EventCard icon={ListChecks} tone="primary" title={`Planned ${plural(queries.length, "sub-query", "sub-queries")}`} t={t}>
      <QueryChips queries={queries} />
    </EventCard>
  );
});

function SourceLine({ source, index }: { source: SourceItem; index: number }) {
  const href = safeHref(source.url);
  return (
    <li
      className="flex items-center gap-2.5 py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <SourceNumber n={source.n} />
      <SourceAvatar domain={source.domain} className="size-5 text-[10px]" />
      <span className="min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-1 font-medium hover:text-primary hover:underline"
            title={source.title}
          >
            {source.title}
          </a>
        ) : (
          <span className="line-clamp-1 font-medium">{source.title}</span>
        )}
        <span className="block truncate font-mono text-xs text-muted-foreground">{source.domain}</span>
      </span>
      <SourceStatusIcon status={source.status} />
    </li>
  );
}

export const SearchCard = memo(function SearchCard({
  round,
  queries,
  sources,
  t,
}: {
  round: number;
  queries: string[];
  sources: Source[];
  t: number;
}) {
  const items = useMemo(() => sources.map(fromRunSource), [sources]);
  const fallbacks = items.filter((s) => s.status === "fallback").length;
  return (
    <EventCard
      icon={Search}
      tone="info"
      title={`Collected ${plural(items.length, "new source")}`}
      meta={
        <>
          {round > 1 ? `Round ${round} follow-up search` : "Initial search"}
          {fallbacks > 0 && ` · ${fallbacks} from search snippets`}
        </>
      }
      t={t}
    >
      <ul className="mb-3 space-y-1" aria-label="Queries searched">
        {queries.map((query) => {
          const count = items.filter((s) => s.query === query).length;
          return (
            <li key={query} className="flex items-center gap-2 text-sm">
              {count > 0 ? (
                <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
              ) : (
                <CircleX className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1 font-mono [overflow-wrap:anywhere]">{query}</span>
              <span className="shrink-0 text-muted-foreground">{count > 0 ? `${count} new` : "nothing new"}</span>
            </li>
          );
        })}
      </ul>
      {items.length > 0 ? (
        <ul className="divide-y">
          {items.map((source, i) => (
            <SourceLine key={source.n} source={source} index={i} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No new pages were found for these queries.</p>
      )}
    </EventCard>
  );
});

export const DraftCard = memo(function DraftCard({ draft, t }: { draft: DraftInfo; t: number }) {
  const [expanded, setExpanded] = useState(false);
  const runSources = useRunStore((s) => s.sources);
  const sources = useMemo(() => new Map(runSources.map((s) => [s.n, fromRunSource(s)])), [runSources]);
  return (
    <EventCard
      icon={PenLine}
      tone="primary"
      title={`Draft ${draft.number} written`}
      meta={`${formatNumber(draft.words)} words`}
      t={t}
    >
      {expanded ? (
        <div className="rounded-lg border bg-background p-4 md:p-6">
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <MarkdownView markdown={draft.markdown} sources={sources} className="[--report-size:15px]" />
          </Suspense>
        </div>
      ) : (
        <p className="relative font-serif text-[15px] leading-relaxed text-muted-foreground">
          {markdownPreview(draft.markdown, 320)}
        </p>
      )}
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {expanded ? "Collapse draft" : "Expand draft"}
      </Button>
    </EventCard>
  );
});

function verdict(review: ReviewInfo, passScore: number, maxIterations: number): string {
  switch (review.reason) {
    case "passed":
      return `Scored ${review.score}/10, at or above the pass mark of ${passScore}. Finalizing.`;
    case "retry":
      return `Below the pass mark of ${passScore}. Searching again to fill the gaps below.`;
    case "max_iterations":
      return `Below the pass mark, but the ${maxIterations}-round limit was reached. Finalizing as is.`;
    case "token_cap":
      return "Below the pass mark, but the token budget is used up. Finalizing as is.";
    case "no_follow_ups":
      return "Below the pass mark, but there was nothing new to search for. Finalizing.";
  }
}

export const ReviewCard = memo(function ReviewCard({
  review,
  t,
  passScore,
  maxIterations,
}: {
  review: ReviewInfo;
  t: number;
  passScore: number;
  maxIterations: number;
}) {
  return (
    <EventCard
      icon={SearchCheck}
      tone={review.passed ? "success" : "warning"}
      title={
        <span className="flex flex-wrap items-center gap-2">
          Review of draft {review.iteration}
          <Badge variant={review.passed ? "success" : "warning"}>
            {review.passed ? <CircleCheck /> : <TriangleAlert />}
            {review.passed ? "Pass" : "Needs work"}
          </Badge>
        </span>
      }
      meta={`Score ${review.score}/10`}
      t={t}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <ScoreRing score={review.score} />
        <div className="min-w-0 flex-1 space-y-3">
          <p>{verdict(review, passScore, maxIterations)}</p>
          {review.missing.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-muted-foreground">Gaps found</h4>
              <ul className="list-disc space-y-1 pl-5">
                {review.missing.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
          {review.next === "searcher" && review.followUps.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-sm font-medium text-muted-foreground">Follow-up queries</h4>
              <QueryChips queries={review.followUps} />
            </div>
          )}
        </div>
      </div>
    </EventCard>
  );
});

export const FinalizerCard = memo(function FinalizerCard({ name, t }: { name: string; t: number }) {
  const ready = useRunStore((s) => s.phase === "done" && s.report?.name === name);
  return (
    <EventCard icon={FileCheck2} tone="success" title="Report saved" t={t}>
      <p className="mb-3 font-mono text-sm [overflow-wrap:anywhere]">reports/{name}.md</p>
      <Button size="sm" disabled={!ready} onClick={() => navigate({ name: "report", report: name })}>
        Open report
      </Button>
    </EventCard>
  );
});

export const NoticeCard = memo(function NoticeCard({
  level,
  title,
  message,
  t,
}: {
  level: "info" | "warning";
  title: string;
  message: string;
  t: number;
}) {
  return (
    <EventCard icon={level === "warning" ? TriangleAlert : Info} tone={level === "warning" ? "warning" : "info"} title={title} t={t}>
      <p className="text-muted-foreground">{message}</p>
    </EventCard>
  );
});

const ERROR_TITLE: Record<string, string> = {
  daily_cap: "Daily Gemini cap reached",
  rate_limit: "Gemini rate limit exceeded",
  missing_keys: "API keys missing",
  network: "Server unreachable",
  lost: "Connection lost",
};

export const ErrorCard = memo(function ErrorCard({ kind, message, t }: { kind: string; message: string; t: number }) {
  return (
    <EventCard icon={CircleX} tone="danger" title={ERROR_TITLE[kind] ?? "The run failed"} t={t}>
      <p className="text-muted-foreground [overflow-wrap:anywhere]">{message}</p>
    </EventCard>
  );
});

export const StoppedCard = memo(function StoppedCard({ reason, t }: { reason: string; t: number }) {
  return (
    <EventCard
      icon={Ban}
      title="Run stopped"
      meta={reason === "disconnected" ? "No browser reconnected within 20 seconds" : "Stopped by you"}
      t={t}
    />
  );
});
