import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiStore } from "@/store/uiStore";

const NODES = [
  { node: "Planner", reads: "question", writes: "sub_queries" },
  { node: "Searcher", reads: "sub_queries or follow_up_queries, sources", writes: "sources (appended, numbers stable)" },
  { node: "Synthesizer", reads: "question, sources, last critique", writes: "draft, drafts" },
  { node: "Reflector", reads: "question, draft, sources", writes: "critique, follow_up_queries, iteration" },
  { node: "Finalizer", reads: "draft, sources", writes: "final_report, report_path" },
];

const STOPS = [
  "The draft scores 8/10 or higher.",
  "Three review rounds have run (MAX_ITERATIONS).",
  "The run reached its token cap (MAX_TOKENS_PER_RUN).",
  "The reviewer proposed no follow-up queries.",
];

const LIMITS = [
  "Paywalls, logins and JavaScript-only pages cannot be scraped; those sources fall back to a short search snippet.",
  "Results inherit the search engine's ranking, including its biases and blind spots.",
  "Claims are only checked against the pages the agent scraped. There is no independent fact-checking.",
  "The token cap is checked between drafts, so a run can exceed it by one draft and one review.",
];

function Box({ x, y, w, label, accent }: { x: number; y: number; w: number; label: string; accent?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={34}
        rx={8}
        className={accent ? "fill-primary/10 stroke-primary" : "fill-card stroke-border"}
        strokeWidth={1.5}
      />
      <text x={x + w / 2} y={y + 21.5} textAnchor="middle" className="fill-foreground font-sans text-[12px] font-medium">
        {label}
      </text>
    </g>
  );
}

/** question -> planner -> searcher -> synthesizer -> reflector -> decision -> finalizer -> report, with the loop edge. */
function Flowchart() {
  return (
    <svg viewBox="0 0 640 200" className="h-auto w-full" role="img" aria-labelledby="flow-title flow-desc">
      <title id="flow-title">Agent flowchart</title>
      <desc id="flow-desc">
        The question goes to the planner, then the searcher, synthesizer and reflector. A decision either loops back to the
        searcher with follow-up queries or goes to the finalizer, which saves the report.
      </desc>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <g className="stroke-muted-foreground" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)">
        <path d="M84 77 H104" />
        <path d="M190 77 H210" />
        <path d="M296 77 H316" />
        <path d="M410 77 H430" />
        <path d="M516 77 H536" />
        <path d="M576 98 V153 H498" />
        <path d="M404 153 H372" />
      </g>
      <path
        d="M576 56 C 576 26, 254 26, 254 58"
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        className="stroke-primary"
        markerEnd="url(#arrow)"
      />
      <text x={414} y={20} textAnchor="middle" className="fill-primary font-mono text-[11px]">
        score &lt; 8 → follow-up queries
      </text>
      <Box x={4} y={60} w={80} label="Question" />
      <Box x={106} y={60} w={84} label="Planner" accent />
      <Box x={212} y={60} w={84} label="Searcher" accent />
      <Box x={318} y={60} w={92} label="Synthesizer" accent />
      <Box x={432} y={60} w={84} label="Reflector" accent />
      <g>
        <path d="M576 56 L616 77 L576 98 L536 77 Z" className="fill-card stroke-border" strokeWidth={1.5} />
        <text x={576} y={81} textAnchor="middle" className="fill-foreground font-sans text-[11px] font-medium">
          Decide
        </text>
      </g>
      <text x={568} y={124} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
        pass or cap
      </text>
      <Box x={404} y={136} w={92} label="Finalizer" accent />
      <Box x={292} y={136} w={78} label="Report" />
    </svg>
  );
}

export function HowItWorksDialog() {
  const open = useUiStore((s) => s.howOpen);
  const setOpen = useUiStore((s) => s.setHowOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>How the agent works</DialogTitle>
          <DialogDescription>
            A LangGraph agent with five nodes sharing one state object turns one question into a cited Markdown report.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-lg border bg-canvas p-3">
          <div className="min-w-[520px]">
            <Flowchart />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">What each node reads and writes</caption>
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Node
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Reads
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Writes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {NODES.map((row) => (
                <tr key={row.node}>
                  <th scope="row" className="px-3 py-2 font-medium">
                    {row.node}
                  </th>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.reads}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.writes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Accordion type="multiple" defaultValue={["stops"]}>
          <AccordionItem value="stops">
            <AccordionTrigger>What stops the loop</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-1 pl-5">
                {STOPS.map((stop) => (
                  <li key={stop}>{stop}</li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="limits">
            <AccordionTrigger>Limitations</AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-1 pl-5">
                {LIMITS.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
