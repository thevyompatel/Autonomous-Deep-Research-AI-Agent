/** A minimal line diff (longest common subsequence), enough to compare two drafts. */

export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

export interface DiffRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

/** Above this many cells the LCS table gets slow; fall back to "all changed". */
const MAX_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length * b.length > MAX_CELLS) {
    return [
      ...a.map((text) => ({ type: "removed" as const, text })),
      ...b.map((text) => ({ type: "added" as const, text })),
    ];
  }

  // lcs[i][j] = length of the LCS of a[i:] and b[j:], stored flat.
  const width = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? (lcs[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(lcs[(i + 1) * width + j] ?? 0, lcs[i * width + j + 1] ?? 0);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] ?? "" });
      i++;
      j++;
    } else if ((lcs[(i + 1) * width + j] ?? 0) >= (lcs[i * width + j + 1] ?? 0)) {
      out.push({ type: "removed", text: a[i] ?? "" });
      i++;
    } else {
      out.push({ type: "added", text: b[j] ?? "" });
      j++;
    }
  }
  while (i < a.length) out.push({ type: "removed", text: a[i++] ?? "" });
  while (j < b.length) out.push({ type: "added", text: b[j++] ?? "" });
  return out;
}

/** Align a diff into side-by-side rows, pairing each removed block with the added block after it. */
export function toRows(lines: DiffLine[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let removed: DiffLine[] = [];
  let added: DiffLine[] = [];
  const flush = () => {
    const count = Math.max(removed.length, added.length);
    for (let k = 0; k < count; k++) rows.push({ left: removed[k] ?? null, right: added[k] ?? null });
    removed = [];
    added = [];
  };
  for (const line of lines) {
    if (line.type === "same") {
      flush();
      rows.push({ left: line, right: line });
    } else if (line.type === "removed") {
      if (added.length) flush();
      removed.push(line);
    } else {
      added.push(line);
    }
  }
  flush();
  return rows;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.type === "added" && line.text.trim()) added++;
    if (line.type === "removed" && line.text.trim()) removed++;
  }
  return { added, removed };
}
