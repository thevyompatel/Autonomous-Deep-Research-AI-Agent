/** Colour for a 0-10 review score: red below 6, amber 6-7, green 8 and up. */
export function scoreTone(score: number): { stroke: string; text: string; label: string } {
  if (score >= 8) return { stroke: "stroke-success", text: "text-success", label: "pass" };
  if (score >= 6) return { stroke: "stroke-warning", text: "text-warning", label: "close" };
  return { stroke: "stroke-destructive", text: "text-destructive", label: "weak" };
}
