/**
 * Owns the connection to the current research job. Lives at module scope so
 * re-renders never open a second stream; components call the exported
 * actions and read state from useRunStore.
 *
 * Robustness:
 * - Events are batched once per animation frame (or a short timeout while the
 *   tab is hidden, when rAF does not run).
 * - If the stream drops without a final event, it reconnects with backoff,
 *   first checking /api/status that the job still exists, then replaying
 *   from the last seq it applied (the reducer drops duplicates).
 */
import { useEffect } from "react";
import { toast } from "sonner";
import { ApiError, api, isAbortError } from "@/api/client";
import { attachRunStream, startRunStream, type StreamHandlers } from "@/api/stream";
import type { RunEvent, Status } from "@/api/types";
import { navigate, parseHash } from "@/hooks/useHashRoute";
import { notify, requestNotificationPermission, setFaviconBadge } from "@/lib/browser";
import { queryClient, queryKeys } from "@/lib/queryClient";
import { isActivePhase, isFinishedPhase, type RunAction } from "@/lib/runReducer";
import { activeStep, STEP_INFO } from "@/lib/stepper";
import { getRun, useRunStore } from "@/store/runStore";

let session = 0;
let controller: AbortController | null = null;
let pending: RunAction[] = [];
let flushQueued = false;
let wakeUp: (() => void) | null = null;

function flush(): void {
  flushQueued = false;
  if (!pending.length) return;
  const batch = pending;
  pending = [];
  getRun().dispatch(batch);
  for (const action of batch) sideEffects(action);
}

function enqueue(event: RunEvent): void {
  pending.push(event);
  if (flushQueued) return;
  flushQueued = true;
  if (document.hidden) {
    setTimeout(flush, 30);
  } else {
    requestAnimationFrame(flush);
    setTimeout(flush, 250); // in case the tab is hidden before the frame
  }
}

function updateUsage(usage: Status["usage"] | undefined): void {
  if (!usage) return;
  queryClient.setQueryData<Status>(queryKeys.status, (old) => (old ? { ...old, usage } : old));
}

function sideEffects(action: RunAction): void {
  if (!("seq" in action)) return;
  if ("usage" in action) updateUsage(action.usage);

  if (action.type === "done") {
    void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
    void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    const open = () => navigate({ name: "report", report: action.name });
    if (parseHash(window.location.hash).name === "run") open();
    toast.success("Report ready", {
      description: action.title,
      action: { label: "Open", onClick: open },
    });
    if (document.hidden) {
      notify("Report ready", action.title);
      setFaviconBadge(true);
    }
  } else if (action.type === "error") {
    void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    toast.error("The research run failed", { description: action.message });
    if (document.hidden) notify("Research run failed", action.message);
  } else if (action.type === "stopped") {
    void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    toast("Research run stopped", {
      description:
        action.reason === "disconnected"
          ? "No browser was connected, so the agent stopped to save quota."
          : "The agent stopped after its current step.",
    });
  }
}

function wait(ms: number, mySession: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      wakeUp = null;
      resolve();
    };
    const timer = setTimeout(done, ms);
    wakeUp = mySession === session ? done : null;
  });
}

function setIdle(): void {
  getRun().setConnection({ status: "idle", retryAt: null, attempt: 0 });
}

function fail(action: Extract<RunAction, { type: "local:error" }>): void {
  flush();
  getRun().dispatch([action]);
  setIdle();
}

function handleApiError(error: ApiError, firstAttempt: boolean): void {
  if (error.status === 409) {
    const runId = typeof error.body.run_id === "string" ? error.body.run_id : null;
    getRun().clear();
    navigate({ name: "compose" });
    void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    toast.error("A research job is already running", {
      description: "Only one job runs at a time.",
      action: runId ? { label: "View progress", onClick: () => attachResearch(runId) } : undefined,
    });
    return;
  }
  if (error.status === 400) {
    getRun().clear();
    navigate({ name: "compose" });
    toast.error(error.message);
    return;
  }
  if (error.status === 503) {
    fail({ type: "local:error", kind: "missing_keys", message: error.message });
    return;
  }
  if (error.status === 404 && !firstAttempt) {
    lost();
    return;
  }
  fail({ type: "local:error", kind: error.status === 404 ? "lost" : "agent", message: error.message });
}

function lost(): void {
  fail({
    type: "local:error",
    kind: "lost",
    message:
      "The connection dropped and this research job is no longer on the server. It stops by itself when no browser reconnects within 20 seconds, and it is lost if the server restarts.",
  });
}

async function runLoop(mySession: number, first: (handlers: StreamHandlers) => Promise<void>): Promise<void> {
  let attempt = 0;
  let firstAttempt = true;

  while (mySession === session) {
    const abort = new AbortController();
    controller = abort;
    const handlers: StreamHandlers = {
      signal: abort.signal,
      onEvent: enqueue,
      onOpen: () => {
        attempt = 0;
        getRun().setConnection({ status: "open", retryAt: null, attempt: 0 });
      },
    };

    try {
      if (firstAttempt) {
        await first(handlers);
      } else {
        const { runId, lastSeq } = getRun();
        if (!runId) return;
        await attachRunStream(runId, lastSeq, handlers);
      }
    } catch (error) {
      if (isAbortError(error) || mySession !== session) return;
      if (error instanceof ApiError && error.status !== 0) {
        handleApiError(error, firstAttempt);
        return;
      }
      // Network error: fall through and reconnect.
    }

    flush();
    if (mySession !== session) return;
    if (isFinishedPhase(getRun().phase)) {
      setIdle();
      return;
    }
    if (firstAttempt && !getRun().runId) {
      fail({ type: "local:error", kind: "network", message: "Could not reach the research server." });
      return;
    }
    firstAttempt = false;

    attempt += 1;
    const delay = Math.min(1000 * 2 ** (attempt - 1), 15_000);
    getRun().setConnection({ status: "reconnecting", retryAt: Date.now() + delay, attempt });
    await wait(delay, mySession);
    if (mySession !== session) return;

    try {
      const status = await api.status();
      queryClient.setQueryData(queryKeys.status, status);
      if (!status.run || status.run.id !== getRun().runId) {
        lost();
        return;
      }
    } catch {
      // Still unreachable: loop round, fail to attach, and back off again.
    }
  }
}

function newSession(): number {
  session += 1;
  controller?.abort();
  controller = null;
  pending = [];
  wakeUp = null;
  return session;
}

/** Start a new research job for `question` and follow it. */
export function startResearch(question: string): void {
  const mySession = newSession();
  requestNotificationPermission();
  const store = getRun();
  store.dispatch([{ type: "local:starting", question }]);
  store.setOwner(true);
  store.setConnection({ status: "connecting", retryAt: null, attempt: 0 });
  navigate({ name: "run" });
  void runLoop(mySession, (handlers) => startRunStream(question, handlers));
}

/** Follow a job that is already running (another tab started it, or the page reloaded). */
export function attachResearch(runId: string, question = ""): void {
  const store = getRun();
  navigate({ name: "run" });
  if (store.runId === runId && store.connection.status !== "idle") return;
  const mySession = newSession();
  store.dispatch([{ type: "local:attaching", question, runId }]);
  store.setOwner(false);
  store.setConnection({ status: "connecting", retryAt: null, attempt: 0 });
  void runLoop(mySession, (handlers) => attachRunStream(runId, 0, handlers));
}

/** Ask the server to stop the job after its current step; the stream reports "stopped". */
export async function stopResearch(): Promise<void> {
  const { runId, phase } = getRun();
  if (!runId || !isActivePhase(phase)) return;
  getRun().dispatch([{ type: "local:stopping" }]);
  try {
    await api.stop(runId);
  } catch (error) {
    toast.error("Could not stop the run", {
      description: error instanceof Error ? error.message : "The server did not respond.",
    });
  }
}

/** Skip the reconnect countdown. */
export function retryNow(): void {
  wakeUp?.();
}

/** Forget the finished job shown in the run view. */
export function clearRun(): void {
  newSession();
  getRun().clear();
}

function runTitle(): string | null {
  const state = getRun();
  if (!isActivePhase(state.phase)) return null;
  const step = activeStep(state.stepper);
  if (state.phase === "stopping") return "(Stopping) Deep Research";
  if (!step) return "(Starting) Deep Research";
  return `(${STEP_INFO[step].verb} ${state.stepper.iteration}/${state.maxIterations}) Deep Research`;
}

/**
 * App-level lifecycle: warn before closing during a run, stop the job when
 * the tab that started it closes, keep the document title current while a
 * job runs and clear the favicon badge when the tab is visible again.
 */
export function useRunLifecycle(pageTitle: string): void {
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isActivePhase(getRun().phase)) return;
      event.preventDefault();
      event.returnValue = "Closing this tab stops the research agent.";
    };
    const pageHide = () => {
      const { owner, runId, phase } = getRun();
      if (owner && runId && isActivePhase(phase)) api.stopBeacon(runId);
    };
    const visibility = () => {
      if (!document.hidden) setFaviconBadge(false);
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pageHide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", pageHide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const phase = useRunStore((s) => s.phase);
  const stepper = useRunStore((s) => s.stepper);
  useEffect(() => {
    document.title = runTitle() ?? pageTitle;
  }, [phase, stepper, pageTitle]);
}

/** The run actions, for components that prefer a hook. */
export function useRunStream() {
  return { start: startResearch, attach: attachResearch, stop: stopResearch, retryNow, clear: clearRun };
}
