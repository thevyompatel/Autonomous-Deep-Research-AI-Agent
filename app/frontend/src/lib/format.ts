import { format, formatDistanceToNowStrict } from "date-fns";

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  return s % 60 ? `${minutes} min ${s % 60} s` : `${minutes} min`;
}

export const formatNumber = (n: number): string => n.toLocaleString();

export function plural(count: number, word: string, many = `${word}s`): string {
  return `${formatNumber(count)} ${count === 1 ? word : many}`;
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy, HH:mm");
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 230));
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Plain-text preview of Markdown: no headings, links or citation numbers. */
export function markdownPreview(markdown: string, length = 280): string {
  const text = markdown
    .replace(/^##\s+Sources[\s\S]*$/m, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, "")
    .replace(/[*_`>|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** "+12s" or "+1m 05s": time since the job started. */
export function formatOffset(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `+${s}s`;
  return `+${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
