import { ArrowRight, Loader2, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { navigate } from "@/hooks/useHashRoute";
import { useElapsed } from "@/hooks/useElapsed";
import { formatClock } from "@/lib/format";
import { isActivePhase, type Phase } from "@/lib/runReducer";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

const BADGE: Record<Phase, { label: string; variant: "primary" | "success" | "warning" | "danger" | "muted" }> = {
  idle: { label: "Idle", variant: "muted" },
  starting: { label: "Starting", variant: "primary" },
  running: { label: "Running", variant: "primary" },
  stopping: { label: "Stopping", variant: "warning" },
  done: { label: "Finished", variant: "success" },
  error: { label: "Failed", variant: "danger" },
  stopped: { label: "Stopped", variant: "muted" },
};

export function RunHeader() {
  const question = useRunStore((s) => s.question);
  const phase = useRunStore((s) => s.phase);
  const model = useRunStore((s) => s.model);
  const report = useRunStore((s) => s.report);
  const setStopDialogOpen = useUiStore((s) => s.setStopDialogOpen);
  const elapsed = useElapsed();
  const badge = BADGE[phase];
  const active = isActivePhase(phase);

  return (
    <header className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">Research question</span>
        <Badge variant={badge.variant}>
          {active && <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse-dot" aria-hidden />}
          {badge.label}
        </Badge>
        {model && <span className="font-mono text-xs">{model}</span>}
        <span className="ml-auto font-mono text-md tabular-nums text-foreground" aria-label={`Elapsed ${formatClock(elapsed)}`}>
          {formatClock(elapsed)}
        </span>
      </div>
      <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">
        {question || "Connecting to the research job…"}
      </h1>
      {(active || (phase === "done" && report)) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {active && (
            <Button
              variant="destructive-outline"
              size="sm"
              onClick={() => setStopDialogOpen(true)}
              disabled={phase === "stopping"}
            >
              {phase === "stopping" ? <Loader2 className="motion-safe:animate-spin" /> : <Square />}
              {phase === "stopping" ? "Stopping after this step…" : "Stop"}
            </Button>
          )}
          {phase === "done" && report && (
            <Button size="sm" onClick={() => navigate({ name: "report", report: report.name })}>
              Open report <ArrowRight />
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
