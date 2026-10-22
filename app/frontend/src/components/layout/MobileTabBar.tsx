import { BookOpen, Library, Telescope, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUiStore, type MobileTab } from "@/store/uiStore";

const TABS: { id: MobileTab; label: string; icon: LucideIcon }[] = [
  { id: "research", label: "Research", icon: Telescope },
  { id: "library", label: "Library", icon: Library },
  { id: "sources", label: "Sources", icon: BookOpen },
];

export function MobileTabBar({ sourceCount }: { sourceCount: number | null }) {
  const tab = useUiStore((s) => s.mobileTab);
  const setTab = useUiStore((s) => s.setMobileTab);
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-safe backdrop-blur-md print:hidden">
      <ul className="grid grid-cols-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const disabled = id === "sources" && sourceCount === null;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setTab(id);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40",
                  tab === id ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {id === "sources" && sourceCount !== null && sourceCount > 0 && (
                    <span className="absolute -right-3 -top-1.5 rounded-full bg-primary px-1 font-mono text-[10px] leading-4 text-primary-foreground">
                      {sourceCount}
                    </span>
                  )}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
