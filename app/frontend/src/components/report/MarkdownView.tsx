import { memo, useMemo, useRef, useState, type ReactNode } from "react";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { CitationGroup } from "@/components/sources/CitationPill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { copyText } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { dataProp, rehypePlugins, remarkPlugins } from "@/lib/markdown";
import { safeHref, type SourceItem } from "@/lib/sources";

interface MarkdownViewProps {
  markdown: string;
  sources: ReadonlyMap<number, SourceItem>;
  citedIn?: ReadonlyMap<number, string[]>;
  onCite?: (n: number) => void;
  className?: string;
}

function InsufficientMark() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="mr-1.5 inline-flex translate-y-[0.12em] rounded text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Insufficient evidence"
        >
          <TriangleAlert className="size-[0.95em]" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>The agent found too little evidence for this point.</TooltipContent>
    </Tooltip>
  );
}

const flaggedClass = "rounded-md bg-warning/10 px-2 py-1 -mx-2 ring-1 ring-inset ring-warning/25";

function CodeBlock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(ref.current?.textContent ?? "")) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div className="group relative my-5">
      <pre ref={ref} className="overflow-x-auto rounded-lg border bg-muted/60 p-4 font-mono text-[0.8em] leading-relaxed">
        {children}
      </pre>
      <button
        type="button"
        onClick={() => void copy()}
        className="absolute right-2 top-2 rounded-md border bg-background/90 p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 coarse:opacity-100"
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

type Props<T extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[T] & ExtraProps;

/** Sanitized Markdown with citation pills. Raw HTML in the source is never rendered. */
function MarkdownViewImpl({ markdown, sources, citedIn, onCite, className }: MarkdownViewProps) {
  const components = useMemo<Components>(
    () => ({
      span: ({ node, children, ...props }: Props<"span">) => {
        const cite = dataProp(node, "dataCite");
        if (cite) {
          return (
            <CitationGroup
              numbers={cite.split(",").map(Number)}
              trail={dataProp(node, "dataTrail") ?? ""}
              sources={sources}
              citedIn={citedIn}
              onCite={onCite}
            />
          );
        }
        return <span {...props}>{children}</span>;
      },
      p: ({ node, children, className: cls, ...props }: Props<"p">) =>
        dataProp(node, "dataInsufficient") ? (
          <p {...props} className={cn(cls, flaggedClass)}>
            <InsufficientMark />
            {children}
          </p>
        ) : (
          <p {...props} className={cls}>
            {children}
          </p>
        ),
      li: ({ node, children, className: cls, ...props }: Props<"li">) =>
        dataProp(node, "dataInsufficient") ? (
          <li {...props} className={cn(cls, flaggedClass)}>
            <InsufficientMark />
            {children}
          </li>
        ) : (
          <li {...props} className={cls}>
            {children}
          </li>
        ),
      a: ({ node: _node, href, children, ...props }: Props<"a">) => {
        const internal = href?.startsWith("#");
        const safe = internal ? href : safeHref(href ?? "");
        if (!safe) return <span className="text-muted-foreground">{children}</span>;
        return (
          <a {...props} href={safe} {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}>
            {children}
          </a>
        );
      },
      table: ({ node: _node, ...props }: Props<"table">) => (
        <div className="my-5 overflow-x-auto rounded-lg border">
          <table {...props} />
        </div>
      ),
      pre: ({ children }: Props<"pre">) => <CodeBlock>{children}</CodeBlock>,
      img: ({ alt }: Props<"img">) => (
        // Images from model output are not loaded: they could track the reader.
        <span className="text-muted-foreground">[image: {alt || "untitled"}]</span>
      ),
    }),
    [sources, citedIn, onCite],
  );

  return (
    <div className={cn("report-prose", className)}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}

const MarkdownView = memo(MarkdownViewImpl);
export default MarkdownView;
