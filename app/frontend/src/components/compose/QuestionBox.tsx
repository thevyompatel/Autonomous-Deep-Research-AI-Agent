import { useEffect, useLayoutEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/uiStore";

const MAX_CHARS = 500;
const LINE_HEIGHT = 26;
const MIN_ROWS = 3;
const MAX_ROWS = 8;

interface QuestionBoxProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

/** Auto-growing question input. Enter or Ctrl/Cmd+Enter submits; Shift+Enter adds a line. */
export function QuestionBox({ onSubmit, disabled, disabledReason }: QuestionBoxProps) {
  const text = useUiStore((s) => s.composeText);
  const setText = useUiStore((s) => s.setComposeText);
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_CHARS && !disabled;

  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = "auto";
    const max = LINE_HEIGHT * MAX_ROWS + 24;
    area.style.height = `${Math.min(Math.max(area.scrollHeight, LINE_HEIGHT * MIN_ROWS + 24), max)}px`;
    area.style.overflowY = area.scrollHeight > max ? "auto" : "hidden";
  }, [text]);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, []);

  const submit = () => {
    if (canSubmit) onSubmit(trimmed);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="group rounded-2xl border bg-card shadow-soft transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10"
    >
      <label htmlFor="question" className="sr-only">
        Research question
      </label>
      <textarea
        id="question"
        ref={ref}
        value={text}
        maxLength={MAX_CHARS}
        rows={MIN_ROWS}
        placeholder="e.g. Compare solid-state and lithium-ion EV batteries for 2026"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        aria-describedby="question-help"
        className="block w-full resize-none bg-transparent px-5 pb-2 pt-4 text-md leading-[26px] placeholder:text-muted-foreground/70 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-1">
        <p id="question-help" className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="max-md:hidden">
            <Kbd>Enter</Kbd> to start · <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> new line
          </span>
          <span className={cn("font-mono tabular-nums", text.length > MAX_CHARS * 0.9 && "text-warning")}>
            {text.length}/{MAX_CHARS}
          </span>
          {disabled && disabledReason && <span className="text-warning">{disabledReason}</span>}
        </p>
        <Button type="submit" size="lg" disabled={!canSubmit} className="max-sm:w-full">
          Start research <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
