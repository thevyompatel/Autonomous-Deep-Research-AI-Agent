import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, PanelRightClose } from "lucide-react";
import { SourceRow } from "@/components/sources/SourceRow";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { plural } from "@/lib/format";
import type { SourceItem, SourceStatus } from "@/lib/sources";
import { useUiStore } from "@/store/uiStore";

type Filter = "all" | SourceStatus;

/** Above this many rows only the visible window is rendered. */
const WINDOW_THRESHOLD = 100;
const ROW_HEIGHT = 64;

interface SourcesPanelProps {
  sources: SourceItem[];
  live?: boolean;
  onSelect: (n: number) => void;
  onCollapse?: () => void;
}

export function SourcesPanel({ sources, live, onSelect, onCollapse }: SourcesPanelProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const highlighted = useUiStore((s) => s.highlightedSource);
  const reduce = useReducedMotion();

  const counts = useMemo(() => {
    const c: Record<SourceStatus, number> = { scraped: 0, fallback: 0, failed: 0, unknown: 0 };
    for (const s of sources) c[s.status] += 1;
    return c;
  }, [sources]);
  const visible = useMemo(
    () => (filter === "all" ? sources : sources.filter((s) => s.status === filter)),
    [sources, filter],
  );

  // Flash rows that arrive after the panel first rendered.
  const seen = useRef<Set<number> | null>(null);
  const firstRender = seen.current === null;
  if (firstRender) seen.current = new Set(sources.map((s) => s.n));
  const fresh = new Set(sources.filter((s) => !seen.current?.has(s.n)).map((s) => s.n));
  useEffect(() => {
    for (const s of sources) seen.current?.add(s.n);
  }, [sources]);

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: sources.length },
    { value: "scraped", label: "Scraped", count: counts.scraped },
    { value: "fallback", label: "Fallback", count: counts.fallback },
    ...(counts.failed ? [{ value: "failed" as const, label: "Failed", count: counts.failed }] : []),
  ];
  const showFilters = counts.unknown < sources.length;

  return (
    <section aria-labelledby="sources-heading" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <BookOpen className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="sources-heading" className="flex-1 font-semibold">
          {live ? "Live sources" : "Sources"}
          <span className="ml-2 font-normal text-muted-foreground">{plural(sources.length, "source")}</span>
        </h2>
        {onCollapse && (
          <SimpleTooltip content="Hide sources (])">
            <Button variant="ghost" size="icon-sm" onClick={onCollapse} aria-label="Hide sources panel">
              <PanelRightClose />
            </Button>
          </SimpleTooltip>
        )}
      </header>
      {showFilters && sources.length > 0 && (
        <div className="border-b px-3 py-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={filter}
            onValueChange={(value) => setFilter((value as Filter) || "all")}
            aria-label="Filter sources by scrape status"
            className="w-full"
          >
            {filters.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value} className="flex-1">
                {f.label}
                <span className="font-mono text-[11px] text-muted-foreground">{f.count}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      {visible.length === 0 ? (
        <p className="px-6 py-10 text-center text-muted-foreground">
          {sources.length === 0
            ? live
              ? "Sources appear here as the agent reads them."
              : "This report lists no sources."
            : "No sources match this filter."}
        </p>
      ) : visible.length > WINDOW_THRESHOLD ? (
        <WindowedList sources={visible} onSelect={onSelect} highlighted={highlighted} />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="space-y-0.5 p-2" aria-live={live ? "polite" : undefined} aria-relevant="additions">
            <AnimatePresence initial={false}>
              {visible.map((source) => (
                <motion.li
                  key={source.n}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <SourceRow
                    source={source}
                    onSelect={onSelect}
                    flash={!firstRender && fresh.has(source.n)}
                    highlighted={highlighted === source.n}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}

/** Renders only the rows in view, for runs with hundreds of sources. */
function WindowedList({
  sources,
  onSelect,
  highlighted,
}: {
  sources: SourceItem[];
  onSelect: (n: number) => void;
  highlighted: number | null;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 30 });

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const start = Math.max(0, Math.floor(element.scrollTop / ROW_HEIGHT) - 8);
        const end = Math.min(sources.length, Math.ceil((element.scrollTop + element.clientHeight) / ROW_HEIGHT) + 8);
        setRange((r) => (r.start === start && r.end === end ? r : { start, end }));
      });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      element.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
    };
  }, [sources.length]);

  return (
    <ScrollArea className="min-h-0 flex-1" viewportRef={viewport}>
      <ul className="relative p-2" style={{ height: sources.length * ROW_HEIGHT + 16 }}>
        {sources.slice(range.start, range.end).map((source, i) => (
          <li
            key={source.n}
            className="absolute inset-x-2"
            style={{ top: 8 + (range.start + i) * ROW_HEIGHT, height: ROW_HEIGHT }}
          >
            <SourceRow source={source} onSelect={onSelect} highlighted={highlighted === source.n} compact />
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
