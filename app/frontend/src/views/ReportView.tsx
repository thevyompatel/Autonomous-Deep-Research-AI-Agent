import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, FileX, RotateCcw } from "lucide-react";
import { ApiError } from "@/api/client";
import { goToCompose } from "@/lib/navigation";
import { BackToTop, ReadingProgress } from "@/components/report/ReadingAids";
import { ReportHeader, TrustBanner } from "@/components/report/ReportHeader";
import { ReportToolbar, type ReportMode } from "@/components/report/ReportToolbar";
import { SourcesSection } from "@/components/report/SourcesSection";
import { TocList } from "@/components/report/Toc";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSkeleton } from "@/components/report/ReportSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useElementWidth } from "@/hooks/useElementWidth";
import { navigate } from "@/hooks/useHashRoute";
import { useReport } from "@/hooks/useLibrary";
import { useToc } from "@/hooks/useToc";
import { useLayout } from "@/hooks/useMediaQuery";
import { useReportSources, useSourceSelect } from "@/hooks/useSources";
import { scrollIntoViewSmooth } from "@/lib/browser";
import { citedIn, parseSourcesSection, stripTitle } from "@/lib/citations";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

const MarkdownView = lazy(() => import("@/components/report/MarkdownView"));
const DraftCompare = lazy(() => import("@/components/report/DraftCompare"));

function BodySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${68 + ((i * 41) % 32)}%` }} />
      ))}
    </div>
  );
}

export default function ReportView({ name }: { name: string }) {
  const { data: report, isLoading, error, refetch } = useReport(name);
  const [mode, setMode] = useState<ReportMode>("final");
  const draft = useReport(mode !== "final" ? report?.first_draft : null);
  const layout = useLayout();
  const container = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const ready = report ? report.name : null;
  const width = useElementWidth(container, ready);
  const fontSize = useUiStore((s) => s.reportFontSize);
  const highlightSource = useUiStore((s) => s.highlightSource);
  const runMatches = useRunStore((s) => s.report?.name === name);
  const toc = useToc(article, `${ready}:${mode}:${layout}`);
  const sources = useReportSources(report);
  const onSelect = useSourceSelect();

  useEffect(() => {
    setMode("final");
    window.scrollTo({ top: 0 });
  }, [name]);

  const sourceMap = useMemo(() => new Map(sources.map((s) => [s.n, s])), [sources]);
  const cited = useMemo(() => citedIn(report?.markdown ?? ""), [report?.markdown]);
  const finalBody = useMemo(() => stripTitle(parseSourcesSection(report?.markdown ?? "").body), [report?.markdown]);
  const draftBody = useMemo(() => stripTitle(parseSourcesSection(draft.data?.markdown ?? "").body), [draft.data?.markdown]);

  const onCite = useCallback(
    (n: number) => {
      scrollIntoViewSmooth(document.getElementById(`source-${n}`));
      highlightSource(n);
    },
    [highlightSource],
  );

  if (isLoading) return <ReportSkeleton />;

  if (error || !report) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
          <FileX className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">{notFound ? "Report not found" : "Couldn't load this report"}</h1>
        <p className="text-muted-foreground">
          {notFound
            ? "It may have been renamed or deleted from the reports folder."
            : error instanceof Error
              ? error.message
              : "The server did not respond."}
        </p>
        <div className="flex gap-2">
          {!notFound && (
            <Button variant="outline" onClick={() => void refetch()}>
              <RotateCcw /> Retry
            </Button>
          )}
          <Button onClick={goToCompose}>Start new research</Button>
        </div>
      </div>
    );
  }

  const wide = width >= 980;
  const hasDraft = Boolean(report.first_draft);

  const body =
    mode === "compare" ? (
      draft.data ? (
        <DraftCompare before={draftBody} after={finalBody} stacked={layout === "mobile"} />
      ) : (
        <BodySkeleton />
      )
    ) : mode === "draft" ? (
      draft.data ? (
        <MarkdownView markdown={draftBody} sources={sourceMap} citedIn={cited} onCite={onCite} />
      ) : (
        <BodySkeleton />
      )
    ) : (
      <MarkdownView markdown={finalBody} sources={sourceMap} citedIn={cited} onCite={onCite} />
    );

  const reading = (
    <article ref={article} className="mx-auto w-full min-w-0 max-w-read" style={{ ["--report-size" as string]: `${fontSize}px` }}>
      <ReportHeader
        title={report.title}
        modified={report.modified}
        words={report.words}
        sourceCount={sources.length}
        revised={hasDraft}
        meta={report.meta}
      />
      <TrustBanner />
      {mode === "draft" && (
        <p className="mb-6 rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground">
          You are reading the first draft, before the review loop revised it.
        </p>
      )}
      <Suspense fallback={<BodySkeleton />}>{body}</Suspense>
      {mode !== "compare" && <SourcesSection sources={sources} citedIn={cited} />}
    </article>
  );

  return (
    <div ref={container} className="px-4 pb-24 pt-4 md:px-6">
      <ReadingProgress target={article} />
      <ReportToolbar
        name={report.name}
        markdown={report.markdown}
        hasDraft={hasDraft}
        mode={mode}
        onModeChange={(next) => startTransition(() => setMode(next))}
        toc={wide ? null : toc}
        compact={layout === "mobile"}
      />
      {runMatches && (
        <Button variant="ghost" size="sm" className="mb-4 print:hidden" onClick={() => navigate({ name: "run" })}>
          <Activity /> View the run that produced this report
        </Button>
      )}
      {layout === "tablet" ? (
        <Tabs defaultValue="report">
          <TabsList className="mb-2">
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="sources">
              Sources <span className="font-mono text-xs text-muted-foreground">{sources.length}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="report" forceMount className="data-[state=inactive]:hidden">
            {reading}
          </TabsContent>
          <TabsContent value="sources">
            <div className="h-[70dvh] overflow-hidden rounded-xl border bg-card">
              <SourcesPanel sources={sources} onSelect={onSelect} />
            </div>
          </TabsContent>
        </Tabs>
      ) : wide ? (
        <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-10">
          <TocList items={toc.items} active={toc.active} />
          {reading}
        </div>
      ) : (
        reading
      )}
      <BackToTop aboveTabBar={layout === "mobile"} />
    </div>
  );
}
