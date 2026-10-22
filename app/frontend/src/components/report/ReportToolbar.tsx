import { AArrowDown, AArrowUp, Copy, Download, Ellipsis, Info, Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { TocMenu } from "@/components/report/Toc";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { reportLink } from "@/hooks/useHashRoute";
import type { TocItem } from "@/hooks/useToc";
import { copyText } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { FONT_SIZES, useUiStore } from "@/store/uiStore";

export type ReportMode = "final" | "draft" | "compare";

interface ReportToolbarProps {
  name: string;
  markdown: string;
  hasDraft: boolean;
  mode: ReportMode;
  onModeChange: (mode: ReportMode) => void;
  toc: { items: TocItem[]; active: string | null } | null;
  compact: boolean;
}

export function ReportToolbar({
  name,
  markdown,
  hasDraft,
  mode,
  onModeChange,
  toc,
  compact,
}: ReportToolbarProps) {
  const fontSize = useUiStore((s) => s.reportFontSize);
  const changeFontSize = useUiStore((s) => s.changeFontSize);
  const trustDismissed = useUiStore((s) => s.trustDismissed);
  const setTrustDismissed = useUiStore((s) => s.setTrustDismissed);

  const copyMarkdown = async () => {
    if (await copyText(markdown)) toast.success("Markdown copied");
    else toast.error("Could not copy to the clipboard");
  };
  const copyLink = async () => {
    if (await copyText(reportLink(name)))
      toast.success("Link copied", { description: "It opens this report in the web UI." });
    else toast.error("Could not copy to the clipboard");
  };
  const print = () => window.print();

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-1 border-b bg-background/85 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 md:-mx-6 md:px-6 print:hidden">
      {hasDraft && (
        <ToggleGroup
          type="single"
          size="sm"
          value={mode}
          onValueChange={(value) => value && onModeChange(value as ReportMode)}
          aria-label="Report version"
          className="mr-1"
        >
          <ToggleGroupItem value="final">Final</ToggleGroupItem>
          <ToggleGroupItem value="draft">First draft</ToggleGroupItem>
          <ToggleGroupItem value="compare">Compare</ToggleGroupItem>
        </ToggleGroup>
      )}
      {toc && <TocMenu items={toc.items} active={toc.active} />}
      <div className="ml-auto flex items-center gap-0.5">
        <div
          className={cn("flex items-center rounded-md border", compact && "hidden")}
          role="group"
          aria-label="Text size"
        >
          <SimpleTooltip content="Smaller text">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => changeFontSize(-1)}
              disabled={fontSize <= FONT_SIZES[0]}
              aria-label="Smaller text"
            >
              <AArrowDown />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Larger text">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => changeFontSize(1)}
              disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]!}
              aria-label="Larger text"
            >
              <AArrowUp />
            </Button>
          </SimpleTooltip>
        </div>
        {trustDismissed && (
          <SimpleTooltip content="About accuracy">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTrustDismissed(false)}
              aria-label="Show the accuracy notice"
            >
              <Info />
            </Button>
          </SimpleTooltip>
        )}
        {compact ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={api.rawReportUrl(name)}
                  download={`${name}.md`}
                  onClick={() => toast("Download started")}
                >
                  <Download /> Download .md
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyMarkdown()}>
                <Copy /> Copy Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copyLink()}>
                <Link2 /> Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  changeFontSize(1);
                }}
                disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]!}
              >
                <AArrowUp /> Larger text
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  changeFontSize(-1);
                }}
                disabled={fontSize <= FONT_SIZES[0]}
              >
                <AArrowDown /> Smaller text
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={print}>
                <Printer /> Print / Save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <SimpleTooltip content="Copy Markdown">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void copyMarkdown()}
                aria-label="Copy Markdown"
              >
                <Copy />
              </Button>
            </SimpleTooltip>
            <SimpleTooltip content="Copy link">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void copyLink()}
                aria-label="Copy link"
              >
                <Link2 />
              </Button>
            </SimpleTooltip>
            <SimpleTooltip content="Print / Save as PDF">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={print}
                aria-label="Print or save as PDF"
              >
                <Printer />
              </Button>
            </SimpleTooltip>
            <a
              href={api.rawReportUrl(name)}
              download={`${name}.md`}
              onClick={() => toast("Download started")}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-1")}
            >
              <Download /> .md
            </a>
          </>
        )}
      </div>
    </div>
  );
}
