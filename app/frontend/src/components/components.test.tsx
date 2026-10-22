import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownView from "@/components/report/MarkdownView";
import { PipelineStepper } from "@/components/run/PipelineStepper";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initialStepper, stepperReduce } from "@/lib/stepper";
import type { SourceItem } from "@/lib/sources";

const sources = new Map<number, SourceItem>([
  [1, { n: 1, title: "NHS inform", url: "https://www.nhsinform.scot", domain: "nhsinform.scot", snippet: "", status: "scraped", query: "" }],
]);

const renderWithTooltips = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("MarkdownView", () => {
  it("turns citations into labelled pills and flags missing sources", () => {
    renderWithTooltips(<MarkdownView markdown={"Lupus is chronic [1][4]."} sources={sources} />);
    expect(screen.getByRole("button", { name: "Source 1: NHS inform" })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Citation 4: no matching source" })).toBeInTheDocument();
  });

  it("never renders raw HTML from the model", () => {
    const { container } = renderWithTooltips(
      <MarkdownView markdown={"<script>alert(1)</script>\n\nText <img src=x onerror=alert(1)> here."} sources={sources} />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.textContent).toContain("Text");
  });

  it("drops javascript: links but keeps their text", () => {
    const { container } = renderWithTooltips(<MarkdownView markdown={"[click me](javascript:alert(1))"} sources={sources} />);
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(container.textContent).toContain("click me");
  });

  it("highlights passages with insufficient evidence", () => {
    renderWithTooltips(<MarkdownView markdown={"There is insufficient evidence for this claim."} sources={sources} />);
    expect(screen.getByRole("button", { name: "Insufficient evidence" })).toBeInTheDocument();
  });

  it("opens external links in a new tab safely", () => {
    renderWithTooltips(<MarkdownView markdown={"[NHS](https://www.nhsinform.scot)"} sources={sources} />);
    const link = screen.getByRole("link", { name: "NHS" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("PipelineStepper", () => {
  it("marks the active step for assistive technology", () => {
    const stepper = [{ type: "start" as const }, { type: "complete" as const, node: "planner" as const }].reduce(
      stepperReduce,
      initialStepper(),
    );
    renderWithTooltips(<PipelineStepper stepper={stepper} maxIterations={3} orientation="horizontal" />);
    expect(screen.getByRole("button", { name: "Searcher: Running" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Planner: Done" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Iteration 1/3")).toBeInTheDocument();
  });
});
