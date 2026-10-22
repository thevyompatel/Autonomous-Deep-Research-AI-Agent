import { CircleHelp, Command, Keyboard, Menu, PanelLeft, PanelRight } from "lucide-react";
import { LogoMark } from "@/components/common/Brand";
import { ThemeMenu } from "@/components/common/ThemeMenu";
import { BackendDot, UsageMeter } from "@/components/layout/StatusBits";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type { Layout } from "@/hooks/useMediaQuery";
import { useUiStore } from "@/store/uiStore";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function TopBar({ layout, title, sourcesAvailable }: { layout: Layout; title: string; sourcesAvailable: boolean }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleSources = useUiStore((s) => s.toggleSources);
  const sourcesCollapsed = useUiStore((s) => s.sourcesCollapsed);
  const setSheetOpen = useUiStore((s) => s.setSheetOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const setHowOpen = useUiStore((s) => s.setHowOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 print:hidden md:px-4">
      {layout === "desktop" && (
        <SimpleTooltip content="Toggle sidebar ([)">
          <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <PanelLeft />
          </Button>
        </SimpleTooltip>
      )}
      {layout === "tablet" && (
        <Button variant="ghost" size="icon-sm" onClick={() => setSheetOpen(true)} aria-label="Open sidebar">
          <Menu />
        </Button>
      )}
      {layout === "mobile" && (
        <a href="#/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <LogoMark className="size-7" />
          <span className="whitespace-nowrap font-semibold">Deep Research</span>
        </a>
      )}
      {layout !== "mobile" && <p className="min-w-0 flex-1 truncate font-medium text-muted-foreground">{title}</p>}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {layout !== "desktop" && (
          <>
            <BackendDot />
            <UsageMeter compact />
          </>
        )}
        {layout === "desktop" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="w-56 justify-between text-muted-foreground"
          >
            <span>Search or jump to…</span>
            <Kbd>{isMac ? "⌘" : "Ctrl"} K</Kbd>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={() => setCommandOpen(true)} aria-label="Open command palette">
            <Command />
          </Button>
        )}
        {layout === "desktop" && (
          <SimpleTooltip content="Keyboard shortcuts (?)">
            <Button variant="ghost" size="icon-sm" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
              <Keyboard />
            </Button>
          </SimpleTooltip>
        )}
        {layout === "desktop" && sourcesAvailable && (
          <SimpleTooltip content={`${sourcesCollapsed ? "Show" : "Hide"} sources (])`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSources}
              aria-label={`${sourcesCollapsed ? "Show" : "Hide"} sources panel`}
              aria-pressed={!sourcesCollapsed}
            >
              <PanelRight />
            </Button>
          </SimpleTooltip>
        )}
        {layout === "mobile" && (
          <>
            <ThemeMenu side="bottom" />
            <Button variant="ghost" size="icon-sm" className="max-sm:hidden" onClick={() => setHowOpen(true)} aria-label="How it works">
              <CircleHelp />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
