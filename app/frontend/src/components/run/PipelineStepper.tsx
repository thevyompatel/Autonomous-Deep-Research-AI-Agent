import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  FileCheck2,
  ListChecks,
  PenLine,
  Repeat,
  Search,
  SearchCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { decisionLabel, STEP_INFO, STEPS, type StepId, type StepStatus, type StepperState } from "@/lib/stepper";

const ICONS: Record<StepId, LucideIcon> = {
  planner: ListChecks,
  searcher: Search,
  synthesizer: PenLine,
  reflector: SearchCheck,
  finalizer: FileCheck2,
};

const STATUS_TEXT: Record<StepStatus, string> = {
  pending: "Waiting",
  active: "Running",
  done: "Done",
  skipped: "Skipped",
  error: "Failed",
};

function StepNode({ id, status, runs, vertical }: { id: StepId; status: StepStatus; runs: number; vertical?: boolean }) {
  const reduce = useReducedMotion();
  const Icon = status === "error" ? X : ICONS[id];
  const info = STEP_INFO[id];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-current={status === "active" ? "step" : undefined}
          aria-label={`${info.label}: ${STATUS_TEXT[status]}${runs > 1 ? `, ran ${runs} times` : ""}`}
          className={cn(
            "group relative flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            vertical ? "w-full items-center gap-3 py-1 text-left" : "flex-col items-center gap-1.5 px-1",
          )}
        >
          <span
            className={cn(
              "relative grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200",
              status === "pending" && "border-border bg-background text-muted-foreground",
              status === "active" && "border-primary bg-background text-primary",
              status === "done" && "border-primary bg-primary text-primary-foreground",
              status === "skipped" && "border-dashed border-border bg-muted/40 text-muted-foreground/70",
              status === "error" && "border-destructive bg-destructive/10 text-destructive",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {status === "active" && !reduce && (
              <motion.span
                aria-hidden
                className="absolute -inset-1.5 rounded-full border-2 border-primary"
                initial={{ opacity: 0.6, scale: 0.9 }}
                animate={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            {status === "done" && (
              <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-success text-success-foreground ring-2 ring-card">
                <Check className="size-2.5" strokeWidth={3} aria-hidden />
              </span>
            )}
            {runs > 1 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-foreground px-1.5 font-mono text-[10px] font-semibold leading-4 text-background">
                ×{runs}
              </span>
            )}
          </span>
          <span className={cn(vertical ? "min-w-0 flex-1" : "text-center")}>
            <span className={cn("block text-sm font-medium", status === "pending" || status === "skipped" ? "text-muted-foreground" : "text-foreground")}>
              {info.label}
            </span>
            <span className={cn("block text-xs text-muted-foreground", !vertical && "max-md:sr-only")}>{STATUS_TEXT[status]}</span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={vertical ? "right" : "bottom"} className="max-w-[260px]">
        <p className="font-medium">{info.label}</p>
        <p className="mt-1 opacity-90">{info.does}</p>
        <p className="mt-1.5 font-mono text-[11px] opacity-75">writes: {info.writes}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** The curved Reflector -> Searcher edge. Lights up once the loop is taken. */
function LoopArrow({ taken, flowing }: { taken: boolean; flowing: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-12" aria-hidden>
      <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <path
          d="M 70 44 C 70 6, 30 6, 30 44"
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeWidth={taken ? 2 : 1.5}
          strokeDasharray="5 5"
          className={cn(taken ? "stroke-primary" : "stroke-border", flowing && "motion-safe:animate-dash-flow")}
        />
      </svg>
      <ChevronDown
        className={cn("absolute top-[30px] size-4 -translate-x-1/2", taken ? "text-primary" : "text-border")}
        style={{ left: "30%" }}
      />
      <span
        className={cn(
          "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-card px-2 py-0.5 font-mono text-[11px]",
          taken ? "border-primary/40 text-primary" : "text-muted-foreground",
        )}
      >
        follow-up queries
      </span>
    </div>
  );
}

export function PipelineStepper({
  stepper,
  maxIterations,
  orientation,
}: {
  stepper: StepperState;
  maxIterations: number;
  orientation: "horizontal" | "vertical";
}) {
  const iteration = Math.min(stepper.iteration, maxIterations);
  const flowing = stepper.loopTaken && stepper.steps.searcher === "active";
  const decision = stepper.decision;

  const header = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-md font-semibold">Pipeline</h2>
      <Badge variant="outline" className="font-mono">
        Iteration {iteration}/{maxIterations}
      </Badge>
      {decision && (
        <Badge variant={decision.next === "searcher" ? "warning" : decision.reason === "passed" ? "success" : "muted"}>
          {decision.next === "searcher" && <Repeat />}
          {decisionLabel(decision)}
        </Badge>
      )}
    </div>
  );

  if (orientation === "vertical") {
    return (
      <section aria-label="Pipeline" className="rounded-xl border bg-card p-4">
        {header}
        <ol className="space-y-1">
          {STEPS.map((id, i) => (
            <li key={id} className="relative">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-1 left-5 h-2 w-px -translate-x-1/2",
                    stepper.steps[id] === "pending" ? "bg-border" : "bg-primary/60",
                  )}
                />
              )}
              <StepNode id={id} status={stepper.steps[id]} runs={stepper.runs[id]} vertical />
              {id === "reflector" && stepper.loopTaken && (
                <p className="ml-[3.25rem] mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary">
                  <Repeat className="size-3" aria-hidden /> Looped back to Searcher with follow-up queries
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section aria-label="Pipeline" className="rounded-xl border bg-card p-5">
      {header}
      <div className="relative pt-12">
        <LoopArrow taken={stepper.loopTaken} flowing={flowing} />
        <ol className="grid grid-cols-5">
          {STEPS.map((id, i) => (
            <li key={id} className="relative flex justify-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(-50%+26px)] right-[calc(50%+26px)] top-5 h-0.5 rounded-full transition-colors duration-300",
                    stepper.steps[id] === "pending" || stepper.steps[id] === "skipped" ? "bg-border" : "bg-primary/60",
                  )}
                />
              )}
              <StepNode id={id} status={stepper.steps[id]} runs={stepper.runs[id]} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
