import { describe, expect, it, vi } from "vitest";
import { createLineSplitter, parseEvent } from "@/api/stream";
import { revisedRun } from "@/test/fixtures";

describe("parseEvent", () => {
  it("accepts every event in a real job", () => {
    for (const event of revisedRun()) expect(parseEvent(event)).toEqual({ kind: "event", event });
  });

  it("fills defaults for fields older servers did not send", () => {
    const parsed = parseEvent({
      seq: 3, t: 1, type: "node", node: "searcher", summary: "", tokens: 0, source_count: 1, round: 1, queries: ["q"],
      sources: [{ n: 1, title: "T", url: "https://a.org", domain: "a.org" }],
    });
    expect(parsed.kind === "event" && parsed.event.type === "node" && parsed.event.node === "searcher" && parsed.event.sources[0])
      .toMatchObject({ scraped: true, snippet: "", query: "" });
  });

  it("ignores unknown event types instead of throwing", () => {
    expect(parseEvent({ seq: 1, t: 0, type: "telemetry", data: 1 })).toEqual({ kind: "ignored" });
    expect(parseEvent({ type: "node", node: "summariser", seq: 2, t: 0 })).toEqual({ kind: "ignored" });
    expect(parseEvent(null)).toEqual({ kind: "ignored" });
  });

  it("ignores malformed known events", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(parseEvent({ type: "done", seq: 5, t: 1 })).toEqual({ kind: "ignored" });
  });

  it("recognises heartbeats", () => {
    expect(parseEvent({ type: "heartbeat" })).toEqual({ kind: "heartbeat" });
  });
});

describe("createLineSplitter", () => {
  it("reassembles lines split across chunks", () => {
    const lines: string[] = [];
    const split = createLineSplitter((line) => lines.push(line));
    split('{"a":1}\n{"b"');
    split(':2}\n\n{"c":3');
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
    split("}", true);
    expect(lines).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });
});
