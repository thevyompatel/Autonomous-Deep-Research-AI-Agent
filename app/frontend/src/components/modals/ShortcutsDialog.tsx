import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useUiStore } from "@/store/uiStore";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl/⌘", "K"], label: "Open the command palette" },
  { keys: ["N"], label: "New research" },
  { keys: ["/"], label: "Search the library" },
  { keys: ["G", "L"], label: "Go to the library" },
  { keys: ["T"], label: "Toggle light and dark theme" },
  { keys: ["["], label: "Collapse or expand the sidebar" },
  { keys: ["]"], label: "Show or hide the sources panel" },
  { keys: ["?"], label: "Show these shortcuts" },
  { keys: ["Esc"], label: "Close a dialog or menu" },
  { keys: ["Enter"], label: "Start research (in the question box)" },
  { keys: ["Shift", "Enter"], label: "New line in the question box" },
];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts work anywhere except while typing in a text box.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">{keys[0] === "G" ? "then" : "+"}</span>}
                    <Kbd>{key}</Kbd>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
