import type { ZodTypeAny } from "zod";
import { errorFrom, request } from "@/api/client";
import {
  doneEventSchema,
  errorEventSchema,
  heartbeatEventSchema,
  nodeEventSchema,
  noticeEventSchema,
  startEventSchema,
  stoppedEventSchema,
} from "@/api/schemas";
import type { RunEvent } from "@/api/types";

const SCHEMAS: Record<string, ZodTypeAny> = {
  start: startEventSchema,
  node: nodeEventSchema,
  notice: noticeEventSchema,
  done: doneEventSchema,
  error: errorEventSchema,
  stopped: stoppedEventSchema,
  heartbeat: heartbeatEventSchema,
};

export type ParsedLine = { kind: "event"; event: RunEvent } | { kind: "heartbeat" } | { kind: "ignored" };

/** Validate one decoded JSON value. Unknown or malformed events are ignored, never thrown. */
export function parseEvent(raw: unknown): ParsedLine {
  if (typeof raw !== "object" || raw === null || !("type" in raw)) return { kind: "ignored" };
  const type = (raw as { type: unknown }).type;
  const schema = typeof type === "string" ? SCHEMAS[type] : undefined;
  if (!schema) return { kind: "ignored" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`Ignored a malformed "${String(type)}" event`, parsed.error.issues);
    return { kind: "ignored" };
  }
  if (type === "heartbeat") return { kind: "heartbeat" };
  return { kind: "event", event: parsed.data as RunEvent };
}

/** Split a chunk stream into complete lines, carrying partial lines over. */
export function createLineSplitter(onLine: (line: string) => void): (chunk: string, final?: boolean) => void {
  let buffer = "";
  return (chunk, final = false) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onLine(line);
      newline = buffer.indexOf("\n");
    }
    if (final && buffer.trim()) {
      onLine(buffer.trim());
      buffer = "";
    }
  };
}

export interface StreamHandlers {
  signal: AbortSignal;
  onEvent: (event: RunEvent) => void;
  /** Called once the server has accepted the request and bytes start flowing. */
  onOpen?: () => void;
  /** Abort the read if nothing (not even a heartbeat) arrives for this long. */
  stallMs?: number;
}

/**
 * Read newline-delimited JSON until the server closes the stream. Resolves
 * normally on close or stall (the caller decides whether to reconnect) and
 * rejects on abort or network errors.
 */
async function readStream(response: Response, handlers: StreamHandlers): Promise<void> {
  const body = response.body;
  if (!body) throw new Error("This browser cannot read streaming responses.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const stallMs = handlers.stallMs ?? 45_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const resetWatchdog = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void reader.cancel("stalled"), stallMs);
  };
  const split = createLineSplitter((line) => {
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      console.warn("Ignored a line that is not JSON", line.slice(0, 120));
      return;
    }
    const parsed = parseEvent(raw);
    if (parsed.kind === "event") handlers.onEvent(parsed.event);
  });

  handlers.onOpen?.();
  resetWatchdog();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      resetWatchdog();
      split(decoder.decode(value, { stream: true }));
    }
    split(decoder.decode(), true);
  } finally {
    clearTimeout(timer);
  }
}

/** POST a question and stream the new job's events from the start. */
export async function startRunStream(question: string, handlers: StreamHandlers): Promise<void> {
  const response = await request("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ question }),
    signal: handlers.signal,
  });
  if (!response.ok) throw await errorFrom(response);
  await readStream(response, handlers);
}

/** Reattach to a job and stream the events after `after`. */
export async function attachRunStream(runId: string, after: number, handlers: StreamHandlers): Promise<void> {
  const response = await request(
    `/api/runs/${encodeURIComponent(runId)}/events?after=${Math.max(0, after)}`,
    { headers: { Accept: "application/x-ndjson" }, signal: handlers.signal },
  );
  if (!response.ok) throw await errorFrom(response);
  await readStream(response, handlers);
}
