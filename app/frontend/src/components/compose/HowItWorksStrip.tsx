import { FileCheck2, ListChecks, PenLine, Repeat, Search, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/uiStore";

const STEPS = [
  { icon: ListChecks, title: "Plan", text: "Splits the question into focused searches" },
  { icon: Search, title: "Search", text: "Reads the top pages on the live web" },
  { icon: PenLine, title: "Write", text: "Drafts a report citing only those pages" },
  { icon: SearchCheck, title: "Review", text: "Scores the draft and finds gaps" },
  { icon: FileCheck2, title: "Finalize", text: "Checks citations and saves the report" },
];

export function HowItWorksStrip() {
  const setHowOpen = useUiStore((s) => s.setHowOpen);
  return (
    <section aria-labelledby="how-heading" className="rounded-2xl border bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="how-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How it works
        </h2>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setHowOpen(true)}>
          Details
        </Button>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-3 lg:flex-col lg:gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex items-start gap-2 border-t pt-4 text-sm text-muted-foreground">
        <Repeat className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Reviews up to 3 times. Stops early when the draft scores 8/10 or higher.
      </p>
    </section>
  );
}
