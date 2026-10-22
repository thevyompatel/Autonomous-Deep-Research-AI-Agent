import { useUiStore } from "@/store/uiStore";

const EXAMPLES = [
  "Compare solid-state and lithium-ion EV batteries for 2026",
  "Explain systemic lupus erythematosus: causes, diagnosis and treatment",
  "What does current research say about intermittent fasting?",
  "How do large language models handle long context?",
];

/** Clicking a chip fills the question box; it never starts a run on its own. */
export function ExampleChips() {
  const setText = useUiStore((s) => s.setComposeText);
  return (
    <div className="flex flex-wrap gap-2" aria-label="Example questions">
      {EXAMPLES.map((example) => (
        <button
          key={example}
          type="button"
          onClick={() => {
            setText(example);
            document.getElementById("question")?.focus();
          }}
          className="rounded-full border bg-card px-3.5 py-1.5 text-left text-sm text-muted-foreground transition-[color,border-color,transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:border-primary/40 hover:text-foreground hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 coarse:min-h-11"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
