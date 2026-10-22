import { describe, expect, it } from "vitest";
import { activeStep, decisionLabel, initialStepper, stepperReduce, type StepperInput, type StepperState } from "@/lib/stepper";

const drive = (inputs: StepperInput[], from: StepperState = initialStepper()) => inputs.reduce(stepperReduce, from);

const firstRound: StepperInput[] = [
  { type: "start" },
  { type: "complete", node: "planner" },
  { type: "complete", node: "searcher" },
  { type: "complete", node: "synthesizer" },
];

describe("stepper state machine", () => {
  it("starts with only the planner active", () => {
    const state = drive([{ type: "start" }]);
    expect(state.steps).toEqual({
      planner: "active",
      searcher: "pending",
      synthesizer: "pending",
      reflector: "pending",
      finalizer: "pending",
    });
    expect(activeStep(state)).toBe("planner");
  });

  it("walks forward one step per completed node", () => {
    const state = drive(firstRound);
    expect(state.steps.planner).toBe("done");
    expect(state.steps.synthesizer).toBe("done");
    expect(activeStep(state)).toBe("reflector");
    expect(state.runs.searcher).toBe(1);
  });

  it("loops back to the searcher when the review asks for more", () => {
    const state = drive([...firstRound, { type: "review", score: 6, reason: "retry", next: "searcher", iteration: 1 }]);
    expect(state.loopTaken).toBe(true);
    expect(state.iteration).toBe(2);
    expect(activeStep(state)).toBe("searcher");
    expect(state.steps.synthesizer).toBe("pending");
    expect(state.steps.reflector).toBe("pending");
    expect(state.runs.reflector).toBe(1);
    expect(state.decision).toEqual({ score: 6, reason: "retry", next: "searcher" });
  });

  it("counts repeated steps across loops and then finalizes", () => {
    const state = drive([
      ...firstRound,
      { type: "review", score: 6, reason: "retry", next: "searcher", iteration: 1 },
      { type: "complete", node: "searcher" },
      { type: "complete", node: "synthesizer" },
      { type: "review", score: 9, reason: "passed", next: "finalizer", iteration: 2 },
    ]);
    expect(state.runs).toMatchObject({ searcher: 2, synthesizer: 2, reflector: 2 });
    expect(state.steps.reflector).toBe("done");
    expect(activeStep(state)).toBe("finalizer");
    const done = drive([{ type: "complete", node: "finalizer" }, { type: "done" }], state);
    expect(Object.values(done.steps)).toEqual(["done", "done", "done", "done", "done"]);
    expect(activeStep(done)).toBeNull();
  });

  it("marks the active step as failed and the rest as skipped on error", () => {
    const state = drive([{ type: "start" }, { type: "complete", node: "planner" }, { type: "error" }]);
    expect(state.steps).toMatchObject({ planner: "done", searcher: "error", synthesizer: "skipped", finalizer: "skipped" });
  });

  it("skips everything that has not run when stopped", () => {
    const state = drive([...firstRound, { type: "stopped" }]);
    expect(state.steps).toMatchObject({ synthesizer: "done", reflector: "skipped", finalizer: "skipped" });
  });

  it("restarts cleanly", () => {
    const state = drive([...firstRound, { type: "start" }]);
    expect(state).toEqual(drive([{ type: "start" }]));
  });

  it("explains each routing decision", () => {
    expect(decisionLabel({ score: 6, reason: "retry", next: "searcher" })).toBe("Score 6/10 → searching again");
    expect(decisionLabel({ score: 8, reason: "passed", next: "finalizer" })).toBe("Score 8/10 → finalizing");
    expect(decisionLabel({ score: 5, reason: "max_iterations", next: "finalizer" })).toBe("Round cap reached → finalizing");
    expect(decisionLabel({ score: 5, reason: "token_cap", next: "finalizer" })).toContain("Token cap");
  });
});
