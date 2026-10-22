import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useNow } from "@/hooks/useNow";
import { queryKeys } from "@/lib/queryClient";

/** Server status: model, keys, Gemini usage, limits and the current job. Polled every 15 s. */
export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: ({ signal }) => api.status(signal),
    refetchInterval: (query) => (query.state.status === "error" ? false : 15_000),
    retry: false,
  });
}

export function useUsage() {
  const { data } = useStatus();
  return data?.usage ?? null;
}

/**
 * Reachability of the Python server with exponential-backoff retries and a
 * countdown. Mount it once (the offline banner); other components can read
 * useStatus().isError.
 */
export function useBackendHealth() {
  const { status, errorUpdatedAt, refetch } = useStatus();
  const failures = useRef(0);
  const [retryAt, setRetryAt] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "error") {
      failures.current = 0;
      setRetryAt(null);
      return;
    }
    failures.current += 1;
    const delay = Math.min(2000 * 2 ** (failures.current - 1), 30_000);
    setRetryAt(Date.now() + delay);
    const timer = setTimeout(() => void refetch(), delay);
    return () => clearTimeout(timer);
  }, [status, errorUpdatedAt, refetch]);

  const now = useNow(1000, retryAt !== null);
  return {
    online: status === "success" ? true : status === "error" ? false : null,
    retryIn: retryAt === null ? null : Math.max(0, Math.ceil((retryAt - now) / 1000)),
    retryNow: () => void refetch(),
  };
}
