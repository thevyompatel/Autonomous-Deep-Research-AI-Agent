/**
 * Pipeline stepper state machine, driven by backend events.
 *
 *   planner -> searcher -> synthesizer -> reflector --(passed / cap)--> finalizer
 *                 ^                          |
 *                 +----(follow-up queries)---+
 */
import type { DecisionReason, NodeName } from "@/api/types";

export const STEPS = ["planner", "searcher", "synthesizer", "reflector", "finalizer"] as const;
export type StepId = NodeName;
export type StepStatus = "pending" | "active" | "done" | "skipped" | "error";

export interface Decision {
  score: number;
  reason: DecisionReason;
  next: "searcher" | "finalizer";
}

export interface StepperState {
  steps: Record<StepId, StepStatus>;
  /** How many times each step has completed. Searcher, Synthesizer and Reflector repeat per loop. */
  runs: Record<StepId, number>;
  /** The draft/review round in progress, starting at 1. */
  iteration: number;
  loopTaken: boolean;
  decision: Decision | null;
}

export type StepperInput =
  | { type: "start" }
  | { type: "complete"; node: Exclude<StepId, "reflector"> }
  | { type: "review"; score: number; reason: DecisionReason; next: "searcher" | "finalizer"; iteration: number }
  | { type: "done" }
  | { type: "error" }
  | { type: "stopped" };

const NEXT: Record<Exclude<StepId, "reflector">, StepId | null> = {
  planner: "searcher",
  searcher: "synthesizer",
  synthesizer: "reflector",
  finalizer: null,
};

const allSteps = (status: StepStatus): Record<StepId, StepStatus> => ({
  planner: status,
  searcher: status,
  synthesizer: status,
  reflector: status,
  finalizer: status,
});

export function initialStepper(): StepperState {
  return {
    steps: allSteps("pending"),
    runs: { planner: 0, searcher: 0, synthesizer: 0, reflector: 0, finalizer: 0 },
    iteration: 1,
    loopTaken: false,
    decision: null,
  };
}

function mapSteps(
  steps: Record<StepId, StepStatus>,
  fn: (status: StepStatus, id: StepId) => StepStatus,
): Record<StepId, StepStatus> {
  const out = { ...steps };
  for (const id of STEPS) out[id] = fn(steps[id], id);
  return out;
}

export function stepperReduce(state: StepperState, input: StepperInput): StepperState {
  switch (input.type) {
    case "start":
      return { ...initialStepper(), steps: { ...allSteps("pending"), planner: "active" } };

    case "complete": {
      const steps = { ...state.steps, [input.node]: "done" as const };
      const next = NEXT[input.node];
      if (next) steps[next] = "active";
      return { ...state, steps, runs: { ...state.runs, [input.node]: state.runs[input.node] + 1 } };
    }

    case "review": {
      const decision: Decision = { score: input.score, reason: input.reason, next: input.next };
      const runs = { ...state.runs, reflector: state.runs.reflector + 1 };
      if (input.next === "searcher") {
        // Loop back: the next round searches, writes and reviews again.
        return {
          ...state,
          runs,
          decision,
          loopTaken: true,
          iteration: input.iteration + 1,
          steps: { ...state.steps, searcher: "active", synthesizer: "pending", reflector: "pending" },
        };
      }
      return {
        ...state,
        runs,
        decision,
        steps: { ...state.steps, reflector: "done", finalizer: "active" },
      };
    }

    case "done":
      return { ...state, steps: mapSteps(state.steps, (s) => (s === "skipped" ? s : "done")) };

    case "error":
      return {
        ...state,
        steps: mapSteps(state.steps, (s) => (s === "active" ? "error" : s === "pending" ? "skipped" : s)),
      };

    case "stopped":
      return {
        ...state,
        steps: mapSteps(state.steps, (s) => (s === "active" || s === "pending" ? "skipped" : s)),
      };
  }
}

export function activeStep(state: StepperState): StepId | null {
  return STEPS.find((id) => state.steps[id] === "active") ?? null;
}

export const STEP_INFO: Record<StepId, { label: string; verb: string; does: string; writes: string }> = {
  planner: {
    label: "Planner",
    verb: "Planning",
    does: "Breaks the question into 3 to 6 focused web searches.",
    writes: "sub_queries",
  },
  searcher: {
    label: "Searcher",
    verb: "Searching",
    does: "Searches the live web and scrapes the top pages. A page that cannot be scraped falls back to the search snippet.",
    writes: "sources (appended; numbers stay stable across loops)",
  },
  synthesizer: {
    label: "Synthesizer",
    verb: "Writing",
    does: "Writes a draft citing only the numbered sources, and says “insufficient evidence” instead of guessing.",
    writes: "draft, drafts",
  },
  reflector: {
    label: "Reflector",
    verb: "Reviewing",
    does: "Scores the draft out of 10, lists gaps and proposes follow-up searches.",
    writes: "critique, follow_up_queries, iteration",
  },
  finalizer: {
    label: "Finalizer",
    verb: "Finalizing",
    does: "Removes invalid [n] citations, builds the Sources list in code and saves the report.",
    writes: "final_report, report_path",
  },
};

export function decisionLabel(decision: Decision): string {
  const score = `Score ${decision.score}/10`;
  switch (decision.reason) {
    case "retry":
      return `${score} → searching again`;
    case "passed":
      return `${score} → finalizing`;
    case "max_iterations":
      return "Round cap reached → finalizing";
    case "token_cap":
      return "Token cap reached → finalizing";
    case "no_follow_ups":
      return `${score}, nothing left to search → finalizing`;
  }
}
