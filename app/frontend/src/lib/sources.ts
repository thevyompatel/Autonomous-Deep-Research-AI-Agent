import type { Source } from "@/api/types";
import { domainOf, type ParsedSource } from "@/lib/citations";

export type SourceStatus = "scraped" | "fallback" | "failed" | "unknown";

/** One source as the panels and citation cards show it, whatever its origin. */
export interface SourceItem {
  n: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  status: SourceStatus;
  query: string;
}

export function fromRunSource(source: Source): SourceItem {
  return {
    n: source.n,
    title: source.title,
    url: source.url,
    domain: source.domain || domainOf(source.url),
    snippet: source.snippet,
    status: source.scraped ? "scraped" : "fallback",
    query: source.query,
  };
}

/** Merge a report's parsed Sources list with richer metadata when available. */
export function mergeSources(parsed: ParsedSource[], known: readonly Source[] | undefined): SourceItem[] {
  const byNumber = new Map((known ?? []).map((s) => [s.n, s]));
  const items = parsed.map((p): SourceItem => {
    const match = byNumber.get(p.n);
    return match && match.url === p.url
      ? fromRunSource(match)
      : { ...p, snippet: "", status: "unknown", query: "" };
  });
  if (items.length || !known) return items;
  return known.map(fromRunSource);
}

/** Only allow http(s) links; anything else becomes inert. */
export function safeHref(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

export const STATUS_LABEL: Record<SourceStatus, string> = {
  scraped: "Scraped",
  fallback: "Search snippet",
  failed: "Failed",
  unknown: "Not recorded",
};

export const STATUS_HELP: Record<SourceStatus, string> = {
  scraped: "The page was scraped and its text was given to the agent.",
  fallback: "Page could not be scraped, used search snippet.",
  failed: "The page could not be read and had no snippet.",
  unknown: "This report was made outside the web UI, so the scrape status was not saved.",
};
