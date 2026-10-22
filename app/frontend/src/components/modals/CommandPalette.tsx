import { Activity, CircleHelp, FileText, Keyboard, Library, Moon, Plus, Sun } from "lucide-react";
import { goToCompose } from "@/lib/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navigate } from "@/hooks/useHashRoute";
import { useLibrary } from "@/hooks/useLibrary";
import { useLayout } from "@/hooks/useMediaQuery";
import { useTheme } from "@/hooks/useTheme";
import { relativeTime } from "@/lib/format";
import { isActivePhase } from "@/lib/runReducer";
import { useRunStore } from "@/store/runStore";
import { useUiStore } from "@/store/uiStore";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const ui = useUiStore.getState;
  const { resolved, toggle } = useTheme();
  const { data: reports } = useLibrary();
  const runActive = useRunStore((s) => isActivePhase(s.phase) || s.phase === "done");
  const layout = useLayout();

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Run a command or open a report">
      <CommandInput placeholder="Type a command or search reports…" />
      <CommandList>
        <CommandEmpty>No matching commands or reports.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(goToCompose)}>
            <Plus /> New research <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          {runActive && (
            <CommandItem onSelect={() => run(() => navigate({ name: "run" }))}>
              <Activity /> View current run
            </CommandItem>
          )}
          <CommandItem
            onSelect={() =>
              run(() => {
                if (layout === "mobile") ui().setMobileTab("library");
                else if (layout === "tablet") ui().setSheetOpen(true);
                else if (ui().sidebarCollapsed) ui().toggleSidebar();
                setTimeout(() => ui().focusLibrarySearch(), 60);
              })
            }
          >
            <Library /> Search the library <CommandShortcut>/</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(toggle)}>
            {resolved === "dark" ? <Sun /> : <Moon />} Switch to {resolved === "dark" ? "light" : "dark"} theme
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => ui().setHowOpen(true))}>
            <CircleHelp /> How it works
          </CommandItem>
          <CommandItem onSelect={() => run(() => ui().setShortcutsOpen(true))}>
            <Keyboard /> Keyboard shortcuts <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {reports && reports.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Reports">
              {reports.map((report) => (
                <CommandItem
                  key={report.name}
                  value={`${report.title} ${report.question ?? ""} ${report.name}`}
                  onSelect={() =>
                    run(() => {
                      ui().setMobileTab("research");
                      navigate({ name: "report", report: report.name });
                    })
                  }
                >
                  <FileText />
                  <span className="min-w-0 flex-1 truncate">{report.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(report.modified)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
