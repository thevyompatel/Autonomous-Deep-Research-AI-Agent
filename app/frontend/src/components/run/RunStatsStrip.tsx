import { useElapsed } from "@/hooks/useElapsed";
import { formatClock, formatNumber } from "@/lib/format";
import { latestDraftWords } from "@/lib/runReducer";
import { useRunStore } from "@/store/runStore";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-md font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Sticky strip of live numbers under the top bar. */
export function RunStatsStrip() {
  const elapsed = useElapsed();
  const sources = useRunStore((s) => s.sources.length);
  const iteration = useRunStore((s) => Math.min(s.stepper.iteration, s.maxIterations));
  const maxIterations = useRunStore((s) => s.maxIterations);
  const words = useRunStore(latestDraftWords);
  const tokens = useRunStore((s) => s.tokens);

  return (
    <dl className="sticky top-14 z-10 grid grid-cols-3 divide-x rounded-xl border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:grid-cols-5">
      <Stat label="Elapsed" value={formatClock(elapsed)} />
      <Stat label="Sources" value={formatNumber(sources)} />
      <Stat label="Iteration" value={`${iteration}/${maxIterations}`} />
      <div className="max-md:hidden">
        <Stat label="Draft words" value={words ? formatNumber(words) : "–"} />
      </div>
      <div className="max-md:hidden">
        <Stat label="Tokens" value={tokens ? formatNumber(tokens) : "–"} />
      </div>
    </dl>
  );
}
