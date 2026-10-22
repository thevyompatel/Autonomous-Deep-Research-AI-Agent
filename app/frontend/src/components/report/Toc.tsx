import { List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { scrollIntoViewSmooth } from "@/lib/browser";
import { cn } from "@/lib/cn";
import type { TocItem } from "@/hooks/useToc";

function jump(id: string) {
  scrollIntoViewSmooth(document.getElementById(id), "start");
}

export function TocList({ items, active }: { items: TocItem[]; active: string | null }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Table of contents" className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto print:hidden">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contents</p>
      <ol className="space-y-0.5 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault(); // keep the #/report route in the address bar
                jump(item.id);
              }}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 border-transparent py-1 pr-2 text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                item.level === 3 ? "pl-6" : "pl-3",
                active === item.id && "border-primary font-medium text-primary",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function TocMenu({ items, active }: { items: TocItem[]; active: string | null }) {
  if (items.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Contents">
          <List /> <span className="max-sm:sr-only">Contents</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Contents</DropdownMenuLabel>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() => jump(item.id)}
            className={cn(item.level === 3 && "pl-6", active === item.id && "font-medium text-primary")}
          >
            <span className="line-clamp-2">{item.text}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
