import { useNow } from "@/hooks/useNow";
import { isActivePhase } from "@/lib/runReducer";
import { useRunStore } from "@/store/runStore";

/** Seconds since the job started: live while it runs, frozen once it ends. */
export function useElapsed(): number {
  const phase = useRunStore((s) => s.phase);
  const startedAt = useRunStore((s) => s.startedAt);
  const endedAfter = useRunStore((s) => s.endedAfter);
  const lastT = useRunStore((s) => s.lastT);
  const live = isActivePhase(phase) && startedAt !== null;
  const now = useNow(1000, live);
  if (endedAfter !== null) return endedAfter;
  if (live && startedAt !== null) return Math.max(lastT, now / 1000 - startedAt);
  return lastT;
}
