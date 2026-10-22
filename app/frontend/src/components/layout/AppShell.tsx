import { lazy, Suspense, useEffect } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Banners } from "@/components/layout/Banners";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { goToCompose } from "@/lib/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LibraryList } from "@/components/library/LibraryList";
import { CommandPalette } from "@/components/modals/CommandPalette";
import { ConfirmStopDialog } from "@/components/modals/ConfirmStopDialog";
import { ReportSkeleton } from "@/components/report/ReportSkeleton";
import { HowItWorksDialog } from "@/components/modals/HowItWorksDialog";
import { ShortcutsDialog } from "@/components/modals/ShortcutsDialog";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useHashRoute, type Route } from "@/hooks/useHashRoute";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useReport } from "@/hooks/useLibrary";
import { useLayout, type Layout } from "@/hooks/useMediaQuery";
import { useRunLifecycle } from "@/hooks/useRunStream";
import { usePanelSources, useSourceSelect } from "@/hooks/useSources";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";
import { ComposeView } from "@/views/ComposeView";
import { RunView } from "@/views/RunView";

const ReportView = lazy(() => import("@/views/ReportView"));

function openLibrary(layout: Layout): void {
  const ui = useUiStore.getState();
  if (layout === "mobile") ui.setMobileTab("library");
  else if (layout === "tablet") ui.setSheetOpen(true);
  else if (ui.sidebarCollapsed) ui.toggleSidebar();
  setTimeout(() => ui.focusLibrarySearch(), 60);
}

function routeKey(route: Route): string {
  return route.name === "report" ? `report:${route.report}` : route.name;
}

export function AppShell() {
  const route = useHashRoute();
  const layout = useLayout();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const sourcesCollapsed = useUiStore((s) => s.sourcesCollapsed);
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const setSheetOpen = useUiStore((s) => s.setSheetOpen);
  const mobileTab = useUiStore((s) => s.mobileTab);
  const question = useRunStore((s) => s.question);
  const { toggle: toggleTheme } = useTheme();
  const panel = usePanelSources(route);
  const onSelectSource = useSourceSelect();
  const reportTitle = useReport(route.name === "report" ? route.report : null).data?.title;

  const title =
    route.name === "report" ? (reportTitle ?? "Report") : route.name === "run" ? question || "Research run" : "New research";
  useRunLifecycle(route.name === "compose" ? "Deep Research" : `${title} · Deep Research`);

  // Any navigation returns mobile users to the main tab and closes the drawer.
  const key = routeKey(route);
  useEffect(() => {
    useUiStore.getState().setMobileTab("research");
    useUiStore.getState().setSheetOpen(false);
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [key]);

  useHotkeys([
    { keys: "mod+k", allowInInputs: true, handler: () => useUiStore.getState().setCommandOpen(true) },
    { keys: "n", handler: goToCompose },
    { keys: "/", handler: () => openLibrary(layout) },
    { keys: "g l", handler: () => openLibrary(layout) },
    { keys: "t", handler: toggleTheme },
    { keys: "[", handler: () => layout === "desktop" && useUiStore.getState().toggleSidebar() },
    { keys: "]", handler: () => layout === "desktop" && useUiStore.getState().toggleSources() },
    { keys: "?", handler: () => useUiStore.getState().setShortcutsOpen(true) },
  ]);

  const view =
    route.name === "run" ? (
      <RunView />
    ) : route.name === "report" ? (
      <Suspense fallback={<ReportSkeleton />}>
        <ReportView name={route.report} />
      </Suspense>
    ) : (
      <ComposeView />
    );

  let content = view;
  if (layout === "mobile" && mobileTab === "library") {
    content = (
      <section aria-label="Library" className="flex h-[calc(100dvh-7rem)] flex-col pt-3">
        <h1 className="px-4 pb-3 text-xl font-semibold">Library</h1>
        <LibraryList />
      </section>
    );
  } else if (layout === "mobile" && mobileTab === "sources" && panel) {
    content = (
      <div className="h-[calc(100dvh-7rem-env(safe-area-inset-bottom))]">
        <SourcesPanel sources={panel.sources} live={panel.live} onSelect={onSelectSource} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {layout === "desktop" && (
        <div className="print:hidden">
          <Sidebar variant={sidebarCollapsed ? "rail" : "full"} />
        </div>
      )}
      {layout === "tablet" && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">Sidebar</SheetTitle>
            <SheetDescription className="sr-only">Library, new research and settings</SheetDescription>
            <Sidebar variant="sheet" onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar layout={layout} title={title} sourcesAvailable={Boolean(panel)} />
        <Banners />
        <div className="flex min-w-0 flex-1">
          <main
            id="main"
            tabIndex={-1}
            className={cn("min-w-0 flex-1 focus:outline-none", layout === "mobile" && "pb-[calc(3.5rem+env(safe-area-inset-bottom))]")}
          >
            <ErrorBoundary key={key} label={route.name === "report" ? "the report" : route.name === "run" ? "the run" : "this page"}>
              {content}
            </ErrorBoundary>
          </main>
          {layout === "desktop" && panel && !sourcesCollapsed && (
            <aside aria-label="Sources" className="sticky top-14 h-[calc(100dvh-3.5rem)] w-80 shrink-0 border-l bg-canvas print:hidden">
              <ErrorBoundary label="the sources">
                <SourcesPanel
                  sources={panel.sources}
                  live={panel.live}
                  onSelect={onSelectSource}
                  onCollapse={() => useUiStore.getState().toggleSources()}
                />
              </ErrorBoundary>
            </aside>
          )}
        </div>
      </div>

      {layout === "mobile" && <MobileTabBar sourceCount={panel ? panel.sources.length : null} />}
      <ConfirmStopDialog />
      <HowItWorksDialog />
      <ShortcutsDialog />
      <CommandPalette />
    </div>
  );
}
