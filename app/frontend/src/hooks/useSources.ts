import { useCallback, useMemo } from "react";
import type { ReportDetail, Source } from "@/api/types";
import type { Route } from "@/hooks/useHashRoute";
import { useReport } from "@/hooks/useLibrary";
import { useLayout } from "@/hooks/useMediaQuery";
import { scrollIntoViewSmooth } from "@/lib/browser";
import { parseSourcesSection } from "@/lib/citations";
import { isActivePhase } from "@/lib/runReducer";
import { fromRunSource, mergeSources, type SourceItem } from "@/lib/sources";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

/** A saved report's sources, enriched with scrape status from run metadata when available. */
export function useReportSources(report: ReportDetail | undefined): SourceItem[] {
  const runSources = useRunStore((s) => (report && s.report?.name === report.name ? s.sources : null));
  return useMemo(() => {
    if (!report) return [];
    const parsed = parseSourcesSection(report.markdown).sources;
    const known: readonly Source[] | undefined = report.meta?.sources ?? runSources ?? undefined;
    return mergeSources(parsed, known);
  }, [report, runSources]);
}

/** What the Sources panel shows for the current route, or null when there is nothing to show. */
export function usePanelSources(route: Route): { sources: SourceItem[]; live: boolean } | null {
  const phase = useRunStore((s) => s.phase);
  const runSources = useRunStore((s) => s.sources);
  const report = useReport(route.name === "report" ? route.report : null).data;
  const reportSources = useReportSources(report);
  const items = useMemo(() => runSources.map(fromRunSource), [runSources]);

  if (route.name === "run") return phase === "idle" ? null : { sources: items, live: isActivePhase(phase) };
  if (route.name === "report" && report) return { sources: reportSources, live: false };
  return null;
}

/** Clicking a source: scroll to where it is cited (or its Sources entry) and highlight it. */
export function useSourceSelect(): (n: number) => void {
  const layout = useLayout();
  return useCallback(
    (n: number) => {
      const ui = useUiStore.getState();
      const go = () => {
        const target =
          document.querySelector(`main [data-cite-n="${n}"]`) ?? document.getElementById(`source-${n}`);
        scrollIntoViewSmooth(target);
        ui.highlightSource(n);
      };
      if (layout === "mobile" && ui.mobileTab === "sources") {
        ui.setMobileTab("research");
        setTimeout(go, 80);
      } else {
        go();
      }
    },
    [layout],
  );
}
