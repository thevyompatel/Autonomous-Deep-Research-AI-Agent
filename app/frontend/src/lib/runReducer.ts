/**
 * The single reducer for a research job. It is pure and idempotent: events
 * carry a `seq`, and anything at or below the last applied seq is ignored, so
 * replaying a stream after a reconnect never duplicates cards or sources.
 */
import type {
  DecisionReason,
  DoneEvent,
  NodeEvent,
  RunEvent,
  Source,
  Usage,
} from "@/api/types";
import { initialStepper, stepperReduce, type StepperState } from "@/lib/stepper";

export type Phase = "idle" | "starting" | "running" | "stopping" | "done" | "error" | "stopped";

export type ErrorKind =
  | "daily_cap"
  | "rate_limit"
  | "missing_keys"
  | "agent"
  | "network"
  | "busy"
  | "lost"
  | "invalid";

export interface DraftInfo {
  number: number;
  words: number;
  markdown: string;
  t: number;
}

export interface ReviewInfo {
  iteration: number;
  score: number;
  passed: boolean;
  missing: string[];
  followUps: string[];
  next: "searcher" | "finalizer";
  reason: DecisionReason;
  t: number;
}

export interface SearchRound {
  round: number;
  queries: string[];
  status: "active" | "done";
  sourceNumbers: number[];
}

export interface ReportInfo {
  name: string;
  title: string;
  markdown: string;
  seconds: number;
  tokens: number;
  iterations: number;
  finalScore: number | null;
  firstDraft: string | null;
}

export type TimelineItem =
  | { id: string; kind: "plan"; t: number; queries: string[] }
  | { id: string; kind: "search"; t: number; round: number; queries: string[]; sources: Source[] }
  | { id: string; kind: "draft"; t: number; draft: DraftInfo }
  | { id: string; kind: "review"; t: number; review: ReviewInfo; maxIterations: number; passScore: number }
  | { id: string; kind: "final"; t: number; name: string }
  | {
      id: string;
      kind: "notice";
      t: number;
      level: "info" | "warning";
      title: string;
      message: string;
    }
  | { id: string; kind: "error"; t: number; errorKind: string; message: string }
  | { id: string; kind: "stopped"; t: number; reason: string };

export interface RunState {
  runId: string | null;
  question: string;
  phase: Phase;
  lastSeq: number;
  /** Seconds since the job started, as of the latest event. */
  lastT: number;
  model: string | null;
  /** Server start time, epoch seconds. */
  startedAt: number | null;
  /** Total duration once the job has ended. */
  endedAfter: number | null;
  maxIterations: number;
  passScore: number;
  maxTokens: number | null;
  stepper: StepperState;
  timeline: TimelineItem[];
  sources: Source[];
  rounds: SearchRound[];
  drafts: DraftInfo[];
  reviews: ReviewInfo[];
  tokens: number;
  usage: Usage | null;
  report: ReportInfo | null;
  error: { kind: ErrorKind; message: string } | null;
  stopReason: string | null;
}

/** Actions that originate in the browser rather than the server. */
export type LocalAction =
  | { type: "local:starting"; question: string }
  | { type: "local:attaching"; question: string; runId: string }
  | { type: "local:stopping" }
  | { type: "local:error"; kind: ErrorKind; message: string };

export type RunAction = RunEvent | LocalAction;

export function initialRunState(question = ""): RunState {
  return {
    runId: null,
    question,
    phase: "idle",
    lastSeq: 0,
    lastT: 0,
    model: null,
    startedAt: null,
    endedAfter: null,
    maxIterations: 3,
    passScore: 8,
    maxTokens: null,
    stepper: initialStepper(),
    timeline: [],
    sources: [],
    rounds: [],
    drafts: [],
    reviews: [],
    tokens: 0,
    usage: null,
    report: null,
    error: null,
    stopReason: null,
  };
}

export const isActivePhase = (phase: Phase): boolean =>
  phase === "starting" || phase === "running" || phase === "stopping";

export const isFinishedPhase = (phase: Phase): boolean =>
  phase === "done" || phase === "error" || phase === "stopped";

const ERROR_KINDS: readonly ErrorKind[] = [
  "daily_cap",
  "rate_limit",
  "missing_keys",
  "agent",
  "network",
  "busy",
  "lost",
  "invalid",
];

function toErrorKind(kind: string): ErrorKind {
  return (ERROR_KINDS as readonly string[]).includes(kind) ? (kind as ErrorKind) : "agent";
}

function applyNode(state: RunState, event: NodeEvent): RunState {
  const id = `e${event.seq}`;
  const base: RunState = { ...state, tokens: event.tokens, usage: event.usage ?? state.usage };

  switch (event.node) {
    case "planner":
      return {
        ...base,
        stepper: stepperReduce(state.stepper, { type: "complete", node: "planner" }),
        rounds: [{ round: 1, queries: event.sub_queries, status: "active", sourceNumbers: [] }],
        timeline: [...state.timeline, { id, kind: "plan", t: event.t, queries: event.sub_queries }],
      };

    case "searcher": {
      const known = new Set(state.sources.map((s) => s.n));
      const fresh = event.sources.filter((s) => !known.has(s.n));
      const numbers = event.sources.map((s) => s.n);
      const rounds = state.rounds.some((r) => r.round === event.round)
        ? state.rounds.map((r) =>
            r.round === event.round
              ? { ...r, queries: event.queries, status: "done" as const, sourceNumbers: numbers }
              : r,
          )
        : [...state.rounds, { round: event.round, queries: event.queries, status: "done" as const, sourceNumbers: numbers }];
      const timeline: TimelineItem[] = [
        ...state.timeline,
        { id, kind: "search", t: event.t, round: event.round, queries: event.queries, sources: event.sources },
      ];
      const fallbacks = event.sources.filter((s) => !s.scraped).length;
      if (fallbacks > 0) {
        timeline.push({
          id: `${id}-fallback`,
          kind: "notice",
          t: event.t,
          level: "warning",
          title: `${fallbacks} page${fallbacks === 1 ? "" : "s"} could not be scraped`,
          message:
            "Paywalls, logins or JavaScript-only pages blocked the scraper, so the search engine's extract was used instead. Those sources carry less detail.",
        });
      }
      return {
        ...base,
        stepper: stepperReduce(state.stepper, { type: "complete", node: "searcher" }),
        sources: [...state.sources, ...fresh].sort((a, b) => a.n - b.n),
        rounds,
        timeline,
      };
    }

    case "synthesizer": {
      const draft: DraftInfo = { number: event.draft_number, words: event.words, markdown: event.draft, t: event.t };
      return {
        ...base,
        stepper: stepperReduce(state.stepper, { type: "complete", node: "synthesizer" }),
        drafts: [...state.drafts, draft],
        timeline: [...state.timeline, { id, kind: "draft", t: event.t, draft }],
      };
    }

    case "reflector": {
      const review: ReviewInfo = {
        iteration: event.iteration,
        score: event.critique.score,
        passed: event.critique.passed,
        missing: event.critique.missing,
        followUps: event.critique.follow_up_queries,
        next: event.next,
        reason: event.reason,
        t: event.t,
      };
      const timeline: TimelineItem[] = [
        ...state.timeline,
        { id, kind: "review", t: event.t, review, maxIterations: state.maxIterations, passScore: state.passScore },
      ];
      if (event.reason === "token_cap") {
        timeline.push({
          id: `${id}-tokens`,
          kind: "notice",
          t: event.t,
          level: "warning",
          title: "Token budget reached",
          message:
            "The run used its token cap, so the agent is finalizing this draft instead of searching again. Raise MAX_TOKENS_PER_RUN in config.py to allow more revision.",
        });
      }
      const rounds =
        event.next === "searcher"
          ? [
              ...state.rounds,
              { round: event.iteration + 1, queries: event.critique.follow_up_queries, status: "active" as const, sourceNumbers: [] },
            ]
          : state.rounds;
      return {
        ...base,
        stepper: stepperReduce(state.stepper, {
          type: "review",
          score: event.critique.score,
          reason: event.reason,
          next: event.next,
          iteration: event.iteration,
        }),
        reviews: [...state.reviews, review],
        rounds,
        timeline,
      };
    }

    case "finalizer":
      return {
        ...base,
        stepper: stepperReduce(state.stepper, { type: "complete", node: "finalizer" }),
        timeline: [...state.timeline, { id, kind: "final", t: event.t, name: event.name }],
      };
  }
}

function reportFrom(event: DoneEvent): ReportInfo {
  return {
    name: event.name,
    title: event.title,
    markdown: event.markdown,
    seconds: event.seconds,
    tokens: event.tokens,
    iterations: event.iterations,
    finalScore: event.final_score,
    firstDraft: event.first_draft,
  };
}

export function reduceRun(state: RunState, action: RunAction): RunState {
  if ("seq" in action) {
    if (action.seq <= state.lastSeq) return state; // already applied (replay after reconnect)
    state = { ...state, lastSeq: action.seq, lastT: action.t };
  }

  switch (action.type) {
    case "local:starting":
      return { ...initialRunState(action.question), phase: "starting" };

    case "local:attaching":
      return { ...initialRunState(action.question), runId: action.runId, phase: "running" };

    case "local:stopping":
      return state.phase === "running" || state.phase === "starting" ? { ...state, phase: "stopping" } : state;

    case "local:error":
      if (isFinishedPhase(state.phase)) return state;
      return {
        ...state,
        phase: "error",
        error: { kind: action.kind, message: action.message },
        stepper: stepperReduce(state.stepper, { type: "error" }),
        timeline: state.runId
          ? [...state.timeline, { id: `local-${state.timeline.length}`, kind: "error", t: state.lastT, errorKind: action.kind, message: action.message }]
          : state.timeline,
      };

    case "start":
      return {
        ...state,
        runId: action.run_id,
        question: action.question,
        phase: state.phase === "stopping" ? "stopping" : "running",
        model: action.model,
        startedAt: action.started_at,
        maxIterations: action.max_iterations,
        passScore: action.pass_score,
        maxTokens: action.max_tokens ?? null,
        usage: action.usage ?? state.usage,
        stepper: stepperReduce(state.stepper, { type: "start" }),
      };

    case "node":
      return applyNode(state, action);

    case "notice": {
      const stopping = action.kind === "stopping";
      const title = stopping
        ? action.reason === "disconnected"
          ? "No browser reconnected, stopping"
          : "Stopping"
        : action.kind === "rate_limit"
          ? "Rate limit hit, waiting"
          : "Notice";
      return {
        ...state,
        phase: stopping && state.phase === "running" ? "stopping" : state.phase,
        stopReason: stopping ? (action.reason ?? "user") : state.stopReason,
        timeline: [
          ...state.timeline,
          { id: `e${action.seq}`, kind: "notice", t: action.t, level: stopping ? "info" : "warning", title, message: action.message },
        ],
      };
    }

    case "done":
      return {
        ...state,
        phase: "done",
        report: reportFrom(action),
        endedAfter: action.seconds,
        tokens: action.tokens,
        usage: action.usage ?? state.usage,
        stepper: stepperReduce(state.stepper, { type: "done" }),
      };

    case "error":
      return {
        ...state,
        phase: "error",
        error: { kind: toErrorKind(action.kind), message: action.message },
        endedAfter: action.t,
        usage: action.usage ?? state.usage,
        stepper: stepperReduce(state.stepper, { type: "error" }),
        timeline: [...state.timeline, { id: `e${action.seq}`, kind: "error", t: action.t, errorKind: action.kind, message: action.message }],
      };

    case "stopped":
      return {
        ...state,
        phase: "stopped",
        stopReason: action.reason,
        endedAfter: action.t,
        stepper: stepperReduce(state.stepper, { type: "stopped" }),
        timeline: [...state.timeline, { id: `e${action.seq}`, kind: "stopped", t: action.t, reason: action.reason }],
      };
  }
}

export function reduceRunAll(state: RunState, actions: readonly RunAction[]): RunState {
  return actions.reduce(reduceRun, state);
}

/** Words in the latest draft, or 0 before the first one. */
export function latestDraftWords(state: RunState): number {
  return state.drafts.at(-1)?.words ?? 0;
}
