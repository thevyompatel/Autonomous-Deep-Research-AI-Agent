import { describe, expect, it } from "vitest";
import { diffLines, diffStats, toRows } from "@/lib/diff";

describe("diffLines", () => {
  it("finds added, removed and unchanged lines", () => {
    expect(diffLines("a\nb\nc", "a\nB\nc\nd")).toEqual([
      { type: "same", text: "a" },
      { type: "removed", text: "b" },
      { type: "added", text: "B" },
      { type: "same", text: "c" },
      { type: "added", text: "d" },
    ]);
  });

  it("reports identical text as unchanged", () => {
    expect(diffLines("x\ny", "x\ny").every((line) => line.type === "same")).toBe(true);
  });

  it("aligns a replaced block side by side", () => {
    const rows = toRows(diffLines("keep\nold 1\nold 2\nend", "keep\nnew 1\nend"));
    expect(rows.map((r) => [r.left?.text ?? null, r.right?.text ?? null])).toEqual([
      ["keep", "keep"],
      ["old 1", "new 1"],
      ["old 2", null],
      ["end", "end"],
    ]);
  });

  it("counts non-blank changes", () => {
    expect(diffStats(diffLines("a\n\nb", "a\nc"))).toEqual({ added: 1, removed: 1 });
  });
});
