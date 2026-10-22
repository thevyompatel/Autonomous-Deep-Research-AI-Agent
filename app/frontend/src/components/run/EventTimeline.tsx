import { memo, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  DraftCard,
  ErrorCard,
  FinalizerCard,
  NoticeCard,
  PlanCard,
  ReviewCard,
  SearchCard,
  StoppedCard,
} from "@/components/run/TimelineCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { isActivePhase, type TimelineItem } from "@/lib/runReducer";
import { activeStep, STEP_INFO, type StepId } from "@/lib/stepper";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

const TimelineEntry = memo(function TimelineEntry({ item }: { item: TimelineItem }) {
  switch (item.kind) {
    case "plan":
      return <PlanCard queries={item.queries} t={item.t} />;
    case "search":
      return <SearchCard round={item.round} queries={item.queries} sources={item.sources} t={item.t} />;
    case "draft":
      return <DraftCard draft={item.draft} t={item.t} />;
    case "review":
      return <ReviewCard review={item.review} t={item.t} passScore={item.passScore} maxIterations={item.maxIterations} />;
    case "final":
      return <FinalizerCard name={item.name} t={item.t} />;
    case "notice":
      return <NoticeCard level={item.level} title={item.title} message={item.message} t={item.t} />;
    case "error":
      return <ErrorCard kind={item.errorKind} message={item.message} t={item.t} />;
    case "stopped":
      return <StoppedCard reason={item.reason} t={item.t} />;
  }
});

function describe(item: TimelineItem): string {
  switch (item.kind) {
    case "plan":
      return `Planned ${item.queries.length} sub-queries.`;
    case "search":
      return `Collected ${item.sources.length} new sources.`;
    case "draft":
      return `Draft ${item.draft.number} written, ${item.draft.words} words.`;
    case "review":
      return `Draft ${item.review.iteration} scored ${item.review.score} out of 10.`;
    case "final":
      return "Report saved.";
    case "notice":
      return item.title;
    case "error":
      return `Error: ${item.message}`;
    case "stopped":
      return "Run stopped.";
  }
}

/** Placeholder for the step that is running now. */
function PendingCard({ step }: { step: StepId }) {
  const rounds = useRunStore((s) => s.rounds);
  const drafts = useRunStore((s) => s.drafts.length);
  const queries = step === "searcher" ? (rounds.find((r) => r.status === "active")?.queries ?? []) : [];
  const label =
    step === "synthesizer"
      ? `Writing draft ${drafts + 1}…`
      : step === "reflector"
        ? `Reviewing draft ${drafts}…`
        : `${STEP_INFO[step].verb}…`;
  return (
    <div className="rounded-xl border border-dashed bg-card/50 px-4 py-3" aria-hidden>
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Loader2 className="size-4 motion-safe:animate-spin" />
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="mt-3 space-y-2 md:pl-[2.75rem]">
        {queries.length > 0 ? (
          queries.map((query) => (
            <div key={query} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 shrink-0 motion-safe:animate-spin" />
              <span className="min-w-0 truncate font-mono">{query}</span>
            </div>
          ))
        ) : (
          <>
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </>
        )}
      </div>
    </div>
  );
}

export function EventTimeline() {
  const timeline = useRunStore((s) => s.timeline);
  const phase = useRunStore((s) => s.phase);
  const stepper = useRunStore((s) => s.stepper);
  const followLive = useUiStore((s) => s.followLive);
  const setFollowLive = useUiStore((s) => s.setFollowLive);
  const reduce = useReducedMotion();
  const top = useRef<HTMLDivElement>(null);

  const items = useMemo(() => [...timeline].reverse(), [timeline]);
  const pending = isActivePhase(phase) ? activeStep(stepper) : null;
  const latest = timeline.at(-1);

  useEffect(() => {
    if (!followLive || !top.current || timeline.length === 0) return;
    const rect = top.current.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight) {
      top.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [timeline.length, followLive, reduce]);

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <div ref={top} className="flex scroll-mt-32 items-center justify-between gap-3">
        <h2 id="activity-heading" className="text-md font-semibold">
          Activity
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          Follow live
          <Switch checked={followLive} onCheckedChange={setFollowLive} aria-label="Follow live events" />
        </label>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latest ? describe(latest) : ""}
      </div>
      <ol className="space-y-3">
        {pending && (
          <li key="pending">
            <PendingCard step={pending} />
          </li>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <TimelineEntry item={item} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {items.length === 0 && !pending && (
        <p className="py-8 text-center text-muted-foreground">Events from the agent will appear here.</p>
      )}
    </section>
  );
}
