import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Download, RotateCcw, Search } from "lucide-react";
import { api } from "@/api/client";
import type { ReportListItem } from "@/api/types";
import { EmptyIllustration } from "@/components/common/Brand";
import { scoreTone } from "@/lib/score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { useHashRoute } from "@/hooks/useHashRoute";
import { useLibrary } from "@/hooks/useLibrary";
import { cn } from "@/lib/cn";
import { formatNumber, relativeTime } from "@/lib/format";
import { useUiStore } from "@/store/uiStore";

export const LibraryItem = memo(function LibraryItem({
  report,
  active,
  onOpen,
}: {
  report: ReportListItem;
  active: boolean;
  onOpen?: () => void;
}) {
  return (
    <li className="group relative">
      <a
        href={`#/report/${report.name}`}
        onClick={onOpen}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block rounded-lg border border-transparent px-3 py-2.5 pr-10 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active && "border-primary/25 bg-primary/[0.07] hover:bg-primary/10",
        )}
      >
        <span className="line-clamp-2 font-medium leading-snug">{report.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <time dateTime={report.modified}>{relativeTime(report.modified)}</time>
          <span aria-hidden>·</span>
          <span>{formatNumber(report.words)} words</span>
          {report.revised && <Badge variant="primary">Revised</Badge>}
          {typeof report.final_score === "number" && (
            <Badge variant="muted" className={scoreTone(report.final_score).text}>
              {report.final_score}/10
            </Badge>
          )}
        </span>
      </a>
      <a
        href={api.rawReportUrl(report.name)}
        download={`${report.name}.md`}
        aria-label={`Download ${report.title} as Markdown`}
        className="absolute right-2 top-2.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 coarse:opacity-100"
      >
        <Download className="size-4" />
      </a>
    </li>
  );
});

/** Saved reports with a filter box (shortcut /). */
export function LibraryList({ onNavigate }: { onNavigate?: () => void }) {
  const { data, isLoading, isError, refetch } = useLibrary();
  const route = useHashRoute();
  const [filter, setFilter] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const focusTick = useUiStore((s) => s.libraryFocusTick);

  useEffect(() => {
    if (focusTick > 0) input.current?.focus();
  }, [focusTick]);

  const reports = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return data ?? [];
    return (data ?? []).filter(
      (r) => r.title.toLowerCase().includes(query) || (r.question ?? "").toLowerCase().includes(query),
    );
  }, [data, filter]);

  const active = route.name === "report" ? route.report : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative px-3 pb-2">
        <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-[calc(50%+4px)] text-muted-foreground" aria-hidden />
        <Input
          ref={input}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setFilter("");
              event.currentTarget.blur();
            }
          }}
          placeholder="Search reports"
          aria-label="Search saved reports"
          className="pl-9 pr-9"
        />
        <Kbd className="absolute right-5 top-1/2 -translate-y-[calc(50%+4px)] max-md:hidden">/</Kbd>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="space-y-3 p-2" aria-label="Loading reports">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="space-y-2 p-3 text-sm text-muted-foreground">
            <p>Couldn&apos;t load the library.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              <RotateCcw /> Retry
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground">
            {(data ?? []).length === 0 ? (
              <>
                <EmptyIllustration />
                <p>No reports yet. Your finished reports appear here.</p>
              </>
            ) : (
              <p>No reports match &ldquo;{filter}&rdquo;.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5" aria-label="Saved reports">
            {reports.map((report) => (
              <LibraryItem key={report.name} report={report} active={report.name === active} onOpen={onNavigate} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
