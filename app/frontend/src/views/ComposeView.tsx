import { ArrowRight, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { ExampleChips } from "@/components/compose/ExampleChips";
import { Hero } from "@/components/compose/Hero";
import { HowItWorksStrip } from "@/components/compose/HowItWorksStrip";
import { QuestionBox } from "@/components/compose/QuestionBox";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { navigate } from "@/hooks/useHashRoute";
import { attachResearch, startResearch } from "@/hooks/useRunStream";
import { useStatus } from "@/hooks/useUsage";
import { isActivePhase } from "@/lib/runReducer";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

/** Replaces the question box while a job is running: only one runs at a time. */
function RunningJobCard({ question, onView }: { question: string; onView: () => void }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
      <p className="flex items-center gap-2 font-medium">
        <Loader2 className="size-4 text-primary motion-safe:animate-spin" aria-hidden />
        A research job is already running
      </p>
      {question && <p className="mt-2 text-muted-foreground [overflow-wrap:anywhere]">&ldquo;{question}&rdquo;</p>}
      <p className="mt-2 text-sm text-muted-foreground">
        Only one job runs at a time so it does not compete for Gemini&apos;s per-minute quota.
      </p>
      <Button className="mt-4" onClick={onView}>
        View progress <ArrowRight />
      </Button>
    </div>
  );
}

export function ComposeView() {
  const { data: status } = useStatus();
  const phase = useRunStore((s) => s.phase);
  const localQuestion = useRunStore((s) => s.question);
  const setComposeText = useUiStore((s) => s.setComposeText);

  const serverRun = status?.run && (status.run.status === "running" || status.run.status === "stopping") ? status.run : null;
  const localActive = isActivePhase(phase);
  const missing = status?.missing_keys ?? [];
  const usage = status?.usage;
  const capReached = Boolean(usage && usage.cap > 0 && usage.used >= usage.cap);

  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,hsl(var(--primary)/0.11),transparent_70%)]"
      />
      <div className="mx-auto max-w-[760px] space-y-8 px-4 pb-16 pt-10 md:px-6 md:pt-20">
        <Hero />
        {missing.length > 0 && (
          <Alert variant="danger">
            <KeyRound />
            <div>
              <p className="font-medium">Add your API keys to start</p>
              <p className="mt-1 text-muted-foreground">
                Put {missing.join(" and ")} in the <code className="font-mono">.env</code> file in the project folder, then
                restart <code className="font-mono">python -m app.web</code>. The file is git-ignored, so keys are never
                committed.
              </p>
            </div>
          </Alert>
        )}
        {localActive || serverRun ? (
          <RunningJobCard
            question={localActive ? localQuestion : (serverRun?.question ?? "")}
            onView={() => (localActive || !serverRun ? navigate({ name: "run" }) : attachResearch(serverRun.id, serverRun.question))}
          />
        ) : (
          <QuestionBox
            onSubmit={(question) => {
              startResearch(question);
              setComposeText("");
            }}
            disabled={capReached || missing.length > 0}
            disabledReason={
              capReached
                ? "Today's Gemini request cap is used up (resets at midnight Pacific)."
                : missing.length
                  ? "API keys are missing."
                  : undefined
            }
          />
        )}
        <ExampleChips />
        <HowItWorksStrip />
        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
          Reports can contain errors. Always check the cited sources.
        </p>
      </div>
    </div>
  );
}
