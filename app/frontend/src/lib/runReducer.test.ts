import { describe, expect, it } from "vitest";
import type { RunEvent } from "@/api/types";
import { initialRunState, reduceRun, reduceRunAll } from "@/lib/runReducer";
import { revisedRun, source } from "@/test/fixtures";

const run = (events: RunEvent[]) => reduceRunAll({ ...initialRunState(), phase: "starting" }, events);

describe("reduceRun", () => {
  it("builds the whole job from a stream of events", () => {
    const state = run(revisedRun());
    expect(state.phase).toBe("done");
    expect(state.runId).toBe("abc123");
    expect(state.lastSeq).toBe(10);
    expect(state.sources.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(state.drafts.map((d) => d.words)).toEqual([400, 520]);
    expect(state.reviews.map((r) => [r.score, r.reason])).toEqual([
      [6, "retry"],
      [9, "passed"],
    ]);
    expect(state.rounds.map((r) => [r.round, r.queries, r.status])).toEqual([
      [1, ["q1", "q2"], "done"],
      [2, ["q3"], "done"],
    ]);
    expect(state.report?.firstDraft).toBe("r-2026-10-22-draft1");
    expect(state.endedAfter).toBe(51);
    expect(state.timeline.map((item) => item.kind)).toEqual([
      "plan",
      "search",
      "notice", // one page fell back to the search snippet
      "draft",
      "review",
      "search",
      "draft",
      "review",
      "final",
    ]);
  });

  it("ignores events it has already applied, so a replay after reconnecting adds nothing", () => {
    const events = revisedRun();
    const once = run(events.slice(0, 6));
    const replayed = reduceRunAll(once, events.slice(0, 6));
    expect(replayed).toBe(once);
    const resumed = reduceRunAll(replayed, events);
    expect(resumed).toEqual(run(events));
  });

  it("never duplicates a source that arrives twice", () => {
    const [start, planner, search] = revisedRun();
    const again = { ...search!, seq: 4, t: 10 } as RunEvent;
    const state = run([start!, planner!, search!, again]);
    expect(state.sources.map((s) => s.n)).toEqual([1, 2]);
  });

  it("marks a stop request, then the stop", () => {
    const [start, planner] = revisedRun();
    let state = run([start!, planner!]);
    state = reduceRun(state, { seq: 3, t: 4, type: "notice", kind: "stopping", reason: "user", message: "Stopping" });
    expect(state.phase).toBe("stopping");
    state = reduceRun(state, { seq: 4, t: 9, type: "stopped", reason: "user" });
    expect(state.phase).toBe("stopped");
    expect(state.stopReason).toBe("user");
    expect(state.stepper.steps.searcher).toBe("skipped");
    expect(state.timeline.at(-1)?.kind).toBe("stopped");
  });

  it("records server errors with their kind", () => {
    const [start] = revisedRun();
    const state = run([start!, { seq: 2, t: 1, type: "error", kind: "daily_cap", message: "cap reached" }]);
    expect(state.phase).toBe("error");
    expect(state.error).toEqual({ kind: "daily_cap", message: "cap reached" });
    expect(state.stepper.steps.planner).toBe("error");
  });

  it("maps unknown error kinds to a generic agent error", () => {
    const [start] = revisedRun();
    const state = run([start!, { seq: 2, t: 1, type: "error", kind: "brand_new_kind", message: "x" }]);
    expect(state.error?.kind).toBe("agent");
  });

  it("does not let a late local error overwrite a finished job", () => {
    const done = run(revisedRun());
    expect(reduceRun(done, { type: "local:error", kind: "lost", message: "dropped" })).toBe(done);
  });

  it("adds a warning when the token cap ends the loop", () => {
    const events = revisedRun().slice(0, 5);
    const review = events[4]!;
    if (review.type !== "node" || review.node !== "reflector") throw new Error("fixture changed");
    const state = run([...events.slice(0, 4), { ...review, next: "finalizer", reason: "token_cap" }]);
    expect(state.timeline.at(-1)).toMatchObject({ kind: "notice", title: "Token budget reached" });
    expect(state.stepper.steps.finalizer).toBe("active");
  });

  it("shows rate-limit waits as warnings", () => {
    const [start] = revisedRun();
    const state = run([start!, { seq: 2, t: 3, type: "notice", kind: "rate_limit", seconds: 31, message: "Waiting 31 s" }]);
    expect(state.timeline.at(-1)).toMatchObject({ kind: "notice", level: "warning", title: "Rate limit hit, waiting" });
    expect(state.phase).toBe("running");
  });

  it("starts fresh for a new question", () => {
    const done = run(revisedRun());
    const fresh = reduceRun(done, { type: "local:starting", question: "Next?" });
    expect(fresh).toMatchObject({ phase: "starting", question: "Next?", lastSeq: 0, sources: [], timeline: [] });
  });

  it("keeps sources sorted by number", () => {
    const [start, planner] = revisedRun();
    const state = run([
      start!,
      planner!,
      { seq: 3, t: 5, type: "node", node: "searcher", summary: "", tokens: 0, source_count: 2, round: 1, queries: ["q1"], sources: [source(2), source(1)] },
    ]);
    expect(state.sources.map((s) => s.n)).toEqual([1, 2]);
  });
});
