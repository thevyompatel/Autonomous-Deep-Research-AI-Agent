import { describe, expect, it } from "vitest";
import { citedIn, parseSourcesSection, splitCitations, stripTitle } from "@/lib/citations";

describe("splitCitations", () => {
  it("leaves plain text alone", () => {
    expect(splitCitations("No citations here.")).toEqual([{ type: "text", value: "No citations here." }]);
  });

  it("groups adjacent citations and keeps the full stop with them", () => {
    expect(splitCitations("Lupus is chronic [1][3][4]. It flares.")).toEqual([
      { type: "text", value: "Lupus is chronic " },
      { type: "cite", numbers: [1, 3, 4], trail: "." },
      { type: "text", value: " It flares." },
    ]);
  });

  it("reads comma lists and drops repeated numbers", () => {
    expect(splitCitations("See [2, 5][5]")).toEqual([
      { type: "text", value: "See " },
      { type: "cite", numbers: [2, 5], trail: "" },
    ]);
  });

  it("keeps separate groups when text sits between them", () => {
    const segments = splitCitations("A [1], then B [2].");
    expect(segments.filter((s) => s.type === "cite")).toEqual([
      { type: "cite", numbers: [1], trail: "," },
      { type: "cite", numbers: [2], trail: "." },
    ]);
  });

  it("does not treat Markdown links or bracketed words as citations", () => {
    expect(splitCitations("[3](https://x.org) and [note]")).toEqual([
      { type: "text", value: "[3](https://x.org) and [note]" },
    ]);
  });
});

const REPORT = `# Research Report: SLE

## Executive summary
SLE is autoimmune [1][2].

## Treatment
Hydroxychloroquine helps [2]. Insufficient evidence on diet [3].

## Sources

1. [Lupus | NHS inform](https://www.nhsinform.scot/lupus)
2. [Treatment [2024 update]](https://example.org/a)
3. [Diet and lupus](https://www.example.com/diet)
`;

describe("parseSourcesSection", () => {
  it("splits the body from the generated Sources list", () => {
    const { body, sources } = parseSourcesSection(REPORT);
    expect(body.endsWith("Insufficient evidence on diet [3].")).toBe(true);
    expect(sources).toEqual([
      { n: 1, title: "Lupus | NHS inform", url: "https://www.nhsinform.scot/lupus", domain: "nhsinform.scot" },
      { n: 2, title: "Treatment [2024 update]", url: "https://example.org/a", domain: "example.org" },
      { n: 3, title: "Diet and lupus", url: "https://www.example.com/diet", domain: "example.com" },
    ]);
  });

  it("returns the whole text when there is no Sources section", () => {
    expect(parseSourcesSection("# Draft\n\nText.")).toEqual({ body: "# Draft\n\nText.", sources: [] });
  });
});

describe("citedIn", () => {
  it("lists the sections that cite each source", () => {
    const map = citedIn(REPORT);
    expect(map.get(1)).toEqual(["Executive summary"]);
    expect(map.get(2)).toEqual(["Executive summary", "Treatment"]);
    expect(map.get(3)).toEqual(["Treatment"]);
  });
});

describe("stripTitle", () => {
  it("removes only the leading title", () => {
    expect(stripTitle("# Title\n\n## Part\nText")).toBe("## Part\nText");
  });
});
