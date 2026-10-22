import { useEffect } from "react";
import { Telescope } from "lucide-react";
import { goToCompose } from "@/lib/navigation";
import { EventTimeline } from "@/components/run/EventTimeline";
import { PipelineStepper } from "@/components/run/PipelineStepper";
import { RunHeader } from "@/components/run/RunHeader";
import { RunOutcomeCard } from "@/components/run/RunOutcomeCard";
import { RunStatsStrip } from "@/components/run/RunStatsStrip";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLayout } from "@/hooks/useMediaQuery";
import { attachResearch } from "@/hooks/useRunStream";
import { usePanelSources, useSourceSelect } from "@/hooks/useSources";
import { useStatus } from "@/hooks/useUsage";
import { useRunStore } from "@/store/runStore";

export function RunView() {
  const phase = useRunStore((s) => s.phase);
  const stepper = useRunStore((s) => s.stepper);
  const maxIterations = useRunStore((s) => s.maxIterations);
  const layout = useLayout();
  const status = useStatus();
  const panel = usePanelSources({ name: "run" });
  const onSelect = useSourceSelect();
  const serverRun = status.data?.run;
  const serverActive = serverRun && (serverRun.status === "running" || serverRun.status === "stopping");

  // Opening #/run with no local job (a reload, or another tab started it): follow the server's job.
  useEffect(() => {
    if (phase === "idle" && serverRun && serverActive) attachResearch(serverRun.id, serverRun.question);
  }, [phase, serverRun, serverActive]);

  if (phase === "idle") {
    if (status.isLoading || serverActive) {
      return (
        <div className="mx-auto max-w-run space-y-4 px-4 py-6 md:px-6" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      );
    }
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Telescope className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">No research is running</h1>
        <p className="text-muted-foreground">Ask a question to start one. Finished reports are in the library.</p>
        <Button onClick={goToCompose}>Start new research</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-run space-y-4 px-4 py-6 md:px-6">
      <RunHeader />
      <RunOutcomeCard />
      <PipelineStepper stepper={stepper} maxIterations={maxIterations} orientation={layout === "mobile" ? "vertical" : "horizontal"} />
      <RunStatsStrip />
      {layout === "tablet" && panel ? (
        <Tabs defaultValue="activity" className="pt-2">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sources">
              Sources <span className="font-mono text-xs text-muted-foreground">{panel.sources.length}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <EventTimeline />
          </TabsContent>
          <TabsContent value="sources">
            <div className="h-[70dvh] overflow-hidden rounded-xl border bg-card">
              <SourcesPanel sources={panel.sources} live={panel.live} onSelect={onSelect} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="pt-2">
          <EventTimeline />
        </div>
      )}
    </div>
  );
}
