import { CircleHelp, Keyboard, Library, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { LogoMark } from "@/components/common/Brand";
import { ThemeMenu } from "@/components/common/ThemeMenu";
import { BackendDot, UsageMeter } from "@/components/layout/StatusBits";
import { LibraryList } from "@/components/library/LibraryList";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { goToCompose } from "@/lib/navigation";
import { useLibrary } from "@/hooks/useLibrary";
import { useUiStore } from "@/store/uiStore";

function Brand() {
  return (
    <a href="#/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <LogoMark />
      <span className="min-w-0">
        <span className="block truncate font-semibold leading-tight">Deep Research</span>
        <span className="block truncate text-xs text-muted-foreground">Autonomous agent</span>
      </span>
    </a>
  );
}

/** Icon rail shown when the desktop sidebar is collapsed. */
function Rail() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setHowOpen = useUiStore((s) => s.setHowOpen);
  return (
    <nav aria-label="Sidebar" className="sticky top-0 flex h-dvh w-16 shrink-0 flex-col items-center gap-2 border-r bg-canvas py-3">
      <a href="#/" aria-label="Deep Research home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <LogoMark />
      </a>
      <Separator className="my-1 w-8" />
      <SimpleTooltip content="New research (N)" side="right">
        <Button size="icon" onClick={goToCompose} aria-label="New research">
          <Plus />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content="Library" side="right">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Open library">
          <Library />
        </Button>
      </SimpleTooltip>
      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeMenu side="right" />
        <SimpleTooltip content="How it works" side="right">
          <Button variant="ghost" size="icon-sm" onClick={() => setHowOpen(true)} aria-label="How it works">
            <CircleHelp />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip content="Expand sidebar ([)" side="right">
          <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Expand sidebar">
            <PanelLeftOpen />
          </Button>
        </SimpleTooltip>
        <div className="py-2">
          <BackendDot />
        </div>
      </div>
    </nav>
  );
}

export function Sidebar({ variant, onNavigate }: { variant: "full" | "rail" | "sheet"; onNavigate?: () => void }) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setHowOpen = useUiStore((s) => s.setHowOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const { data } = useLibrary();

  if (variant === "rail") return <Rail />;

  return (
    <nav
      aria-label="Sidebar"
      className={
        variant === "full"
          ? "sticky top-0 flex h-dvh w-[280px] shrink-0 flex-col border-r bg-canvas"
          : "flex h-full flex-col bg-canvas"
      }
    >
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <Brand />
        {variant === "full" && (
          <SimpleTooltip content="Collapse sidebar ([)">
            <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={toggleSidebar} aria-label="Collapse sidebar">
              <PanelLeftClose />
            </Button>
          </SimpleTooltip>
        )}
      </div>
      <div className="px-3 pb-4">
        <Button
          className="w-full justify-between"
          onClick={() => {
            goToCompose();
            onNavigate?.();
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Plus /> New research
          </span>
          <Kbd className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground max-md:hidden">N</Kbd>
        </Button>
      </div>
      <div className="flex items-baseline justify-between px-4 pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Library</h2>
        {data && <span className="font-mono text-xs text-muted-foreground">{data.length}</span>}
      </div>
      <LibraryList onNavigate={onNavigate} />
      <div className="space-y-2 border-t p-3">
        <UsageMeter />
        <div className="flex items-center gap-1">
          <ThemeMenu />
          <SimpleTooltip content="How it works">
            <Button variant="ghost" size="icon-sm" onClick={() => setHowOpen(true)} aria-label="How it works">
              <CircleHelp />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="Keyboard shortcuts (?)">
            <Button variant="ghost" size="icon-sm" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
              <Keyboard />
            </Button>
          </SimpleTooltip>
          <span className="ml-auto pr-1">
            <BackendDot withLabel />
          </span>
        </div>
      </div>
    </nav>
  );
}
