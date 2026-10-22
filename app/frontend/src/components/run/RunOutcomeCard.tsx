import { Ban, CircleCheck, CircleX, KeyRound, Pencil, RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { navigate } from "@/hooks/useHashRoute";
import { attachResearch, startResearch } from "@/hooks/useRunStream";
import { useStatus } from "@/hooks/useUsage";
import type { ErrorKind, TimelineItem } from "@/lib/runReducer";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

function completedSteps(timeline: TimelineItem[]): string[] {
  const steps: string[] = [];
  for (const item of timeline) {
    if (item.kind === "plan") steps.push(`Planned ${item.queries.length} sub-queries`);
    if (item.kind === "search") steps.push(`Collected ${item.sources.length} sources (round ${item.round})`);
    if (item.kind === "draft") steps.push(`Wrote draft ${item.draft.number} (${item.draft.words.toLocaleString()} words)`);
    if (item.kind === "review") steps.push(`Reviewed draft ${item.review.iteration}: ${item.review.score}/10`);
  }
  return steps;
}

const ERRORS: Record<ErrorKind, { title: string; body: string; retry: boolean }> = {
  missing_keys: {
    title: "API keys are missing",
    body: "Add GEMINI_API_KEY and TAVILY_API_KEY to the .env file in the project folder, then restart the server with python -m app.web. The .env file is git-ignored, so your keys are never committed.",
    retry: false,
  },
  daily_cap: {
    title: "Today's Gemini request cap is used up",
    body: "The app stops before it spends past LLM_REQUESTS_PER_DAY. The count resets at midnight Pacific time, or you can raise the cap in .env if your quota allows.",
    retry: false,
  },
  rate_limit: {
    title: "Gemini's rate limit was exceeded",
    body: "Gemini refused more requests for now. Wait a minute and try again, or lower LLM_REQUESTS_PER_MINUTE in .env.",
    retry: true,
  },
  network: {
    title: "Couldn't reach the research server",
    body: "Check that python -m app.web is still running in your terminal, then try again.",
    retry: true,
  },
  lost: {
    title: "Connection lost",
    body: "The connection dropped long enough that the research job ended. Nothing was saved for this run.",
    retry: true,
  },
  busy: {
    title: "Another research job is running",
    body: "Only one job runs at a time, so Gemini's per-minute quota is not shared between runs.",
    retry: false,
  },
  invalid: {
    title: "That question can't be researched",
    body: "Enter a question between 1 and 500 characters.",
    retry: false,
  },
  agent: {
    title: "The agent hit an unexpected error",
    body: "The run stopped. The technical details below may help; trying again often works.",
    retry: true,
  },
};

/** State D: what happened when a run stopped or failed, and what to do next. */
export function RunOutcomeCard() {
  const phase = useRunStore((s) => s.phase);
  const question = useRunStore((s) => s.question);
  const timeline = useRunStore((s) => s.timeline);
  const error = useRunStore((s) => s.error);
  const stopReason = useRunStore((s) => s.stopReason);
  const setComposeText = useUiStore((s) => s.setComposeText);
  const status = useStatus().data;

  const editQuestion = () => {
    setComposeText(question);
    navigate({ name: "compose" });
  };

  if (phase === "stopped") {
    const steps = completedSteps(timeline);
    return (
      <section className="rounded-xl border bg-card p-5" aria-labelledby="outcome-title">
        <div className="flex items-start gap-3">
          <Ban className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="outcome-title" className="text-md font-semibold">
              Run stopped
            </h2>
            <p className="mt-1 text-muted-foreground">
              {stopReason === "disconnected"
                ? "No browser was connected for 20 seconds, so the agent stopped to save quota. Nothing was saved."
                : "You stopped the agent. Nothing was saved to the library."}
            </p>
            {steps.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-medium text-muted-foreground">Completed before stopping</h3>
                <ul className="mt-1.5 space-y-1">
                  {steps.map((step) => (
                    <li key={step} className="flex items-center gap-2">
                      <CircleCheck className="size-4 text-success" aria-hidden /> {step}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate({ name: "compose" })}>
                Start over
              </Button>
              <Button size="sm" variant="outline" onClick={editQuestion}>
                <Pencil /> Edit question
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (phase !== "error" || !error) return null;
  const info = ERRORS[error.kind];
  const Icon = error.kind === "missing_keys" ? KeyRound : error.kind === "network" || error.kind === "lost" ? WifiOff : CircleX;
  const runningElsewhere = status?.run && (status.run.status === "running" || status.run.status === "stopping") ? status.run : null;

  return (
    <section role="alert" className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-5" aria-labelledby="outcome-title">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="outcome-title" className="text-md font-semibold">
            {info.title}
          </h2>
          <p className="mt-1 text-muted-foreground">{info.body}</p>
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Technical details
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">
                {error.kind}: {error.message}
              </pre>
            </CollapsibleContent>
          </Collapsible>
          <div className="mt-4 flex flex-wrap gap-2">
            {info.retry && question && (
              <Button size="sm" onClick={() => startResearch(question)}>
                <RotateCcw /> Try again
              </Button>
            )}
            {error.kind === "busy" && runningElsewhere && (
              <Button size="sm" onClick={() => attachResearch(runningElsewhere.id, runningElsewhere.question)}>
                View progress
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={editQuestion}>
              <Pencil /> Edit question
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
