import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { diffLines, diffStats, toRows, type DiffLine } from "@/lib/diff";

function Line({ line, side }: { line: DiffLine | null; side: "left" | "right" | "unified" }) {
  if (!line) return <div className="bg-muted/30" aria-hidden />;
  const text = line.text.trim();
  const removed = line.type === "removed";
  const added = line.type === "added";
  return (
    <div
      className={cn(
        "flex gap-2 px-3 py-1 font-serif text-[15px] leading-relaxed",
        removed && "bg-destructive/10",
        added && "bg-success/10",
        !text && "py-0.5",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "w-3 shrink-0 select-none font-mono text-xs leading-[1.7rem]",
          removed ? "text-destructive" : added ? "text-success" : "text-transparent",
        )}
      >
        {removed ? "−" : added ? "+" : side === "unified" ? " " : ""}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
        {removed && <span className="sr-only">Removed: </span>}
        {added && <span className="sr-only">Added: </span>}
        {text}
      </span>
    </div>
  );
}

/** Line-level comparison of the first draft and the final report. */
export default function DraftCompare({ before, after, stacked }: { before: string; after: string; stacked: boolean }) {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const rows = useMemo(() => toRows(lines), [lines]);
  const stats = useMemo(() => diffStats(lines), [lines]);

  return (
    <section aria-label="Draft comparison" className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          <span className="mr-1 inline-block size-3 rounded-sm bg-destructive/25 align-middle" aria-hidden />
          {stats.removed} lines only in the first draft
        </span>
        <span>
          <span className="mr-1 inline-block size-3 rounded-sm bg-success/25 align-middle" aria-hidden />
          {stats.added} lines only in the final report
        </span>
      </p>
      {stacked ? (
        <div className="divide-y overflow-hidden rounded-lg border">
          {lines.map((line, i) => (
            <Line key={i} line={line} side="unified" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-2 border-b bg-muted text-sm font-medium">
            <div className="border-r px-3 py-2">First draft</div>
            <div className="px-3 py-2">Final report</div>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 border-b last:border-b-0">
              <div className="border-r">
                <Line line={row.left} side="left" />
              </div>
              <Line line={row.right} side="right" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
