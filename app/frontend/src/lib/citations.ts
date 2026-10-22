/**
 * Citation helpers. The finalizer writes citations as [n] or [n, m] and a
 * "## Sources" list of "n. [Title](url)" lines generated in code.
 */

/** [3] or [1, 4]; a following "(" means a Markdown link, not a citation. */
const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;
const TRAILING_PUNCTUATION = /^[.,;:!?)]+/;

export type Segment =
  | { type: "text"; value: string }
  | { type: "cite"; numbers: number[]; trail: string };

/**
 * Split text into plain runs and citation groups. Adjacent citations such as
 * "[1][3]" become one group, and punctuation right after a group is attached
 * to it so a full stop never wraps onto its own line.
 */
export function splitCitations(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let group: Extract<Segment, { type: "cite" }> | null = null;

  const closeGroup = () => {
    if (!group) return;
    const trail = TRAILING_PUNCTUATION.exec(text.slice(last));
    if (trail) {
      group.trail = trail[0];
      last += trail[0].length;
    }
    group = null;
  };

  for (const match of text.matchAll(CITATION)) {
    const index = match.index;
    const numbers = (match[1] ?? "").split(",").map((n) => Number(n.trim()));
    if (group && index !== last) closeGroup();
    if (!group) {
      if (index > last) segments.push({ type: "text", value: text.slice(last, index) });
      group = { type: "cite", numbers: [], trail: "" };
      segments.push(group);
    }
    for (const n of numbers) if (!group.numbers.includes(n)) group.numbers.push(n);
    last = index + match[0].length;
  }
  closeGroup();
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

export interface ParsedSource {
  n: number;
  title: string;
  url: string;
  domain: string;
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const SOURCES_HEADING = /^##\s+Sources\s*$/im;
const SOURCE_LINE = /^\s*(\d+)\.\s+\[(.*)\]\((\S+?)\)\s*$/;

/** Split a report into its body and the parsed "## Sources" list. */
export function parseSourcesSection(markdown: string): { body: string; sources: ParsedSource[] } {
  const match = SOURCES_HEADING.exec(markdown);
  if (!match) return { body: markdown, sources: [] };
  const body = markdown.slice(0, match.index).trimEnd();
  const sources: ParsedSource[] = [];
  for (const line of markdown.slice(match.index + match[0].length).split("\n")) {
    const source = SOURCE_LINE.exec(line);
    if (!source) continue;
    const url = source[3] ?? "";
    sources.push({ n: Number(source[1]), title: source[2] ?? url, url, domain: domainOf(url) });
  }
  return { body, sources };
}

/** For each source number, the "## " sections whose text cites it, in order. */
export function citedIn(markdown: string): Map<number, string[]> {
  const { body } = parseSourcesSection(markdown);
  const map = new Map<number, string[]>();
  let section = "Introduction";
  for (const line of body.split("\n")) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      section = heading[1] ?? section;
      continue;
    }
    if (/^#\s/.test(line)) continue;
    for (const segment of splitCitations(line)) {
      if (segment.type !== "cite") continue;
      for (const n of segment.numbers) {
        const sections = map.get(n) ?? [];
        if (!sections.includes(section)) sections.push(section);
        map.set(n, sections);
      }
    }
  }
  return map;
}

/** Remove the leading "# Title" line, which the report header already shows. */
export function stripTitle(markdown: string): string {
  return markdown.replace(/^\s*#\s+.+\n+/, "");
}

export const INSUFFICIENT_EVIDENCE = /insufficient evidence/i;
