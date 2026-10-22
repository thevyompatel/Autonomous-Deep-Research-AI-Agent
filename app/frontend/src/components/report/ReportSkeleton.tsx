import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for a report. Kept out of the lazy report chunk so it can be a Suspense fallback. */
export function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-read space-y-4 px-4 py-10" aria-busy="true" aria-label="Loading report">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-9 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <div className="space-y-3 pt-6">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-3.5" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
        ))}
      </div>
    </div>
  );
}
