import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryKeys } from "@/lib/queryClient";

export function useLibrary() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: ({ signal }) => api.reports(signal),
  });
}

export function useReport(name: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.report(name ?? ""),
    queryFn: ({ signal }) => api.report(name ?? "", signal),
    enabled: Boolean(name),
    staleTime: 60_000,
  });
}
