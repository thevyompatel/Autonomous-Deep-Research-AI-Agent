import { useEffect, useState, type RefObject } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Headings (h2, h3) inside `ref`, plus the one currently being read. Watches
 * the DOM because the Markdown renders lazily after this hook first runs.
 */
export function useToc(ref: RefObject<HTMLElement>, key?: unknown): { items: TocItem[]; active: string | null } {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let observer: IntersectionObserver | null = null;

    const collect = () => {
      const headings = [...root.querySelectorAll<HTMLElement>("h2[id], h3[id]")];
      setItems((old) => {
        const next = headings.map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? (2 as const) : (3 as const) }));
        const same = old.length === next.length && old.every((item, i) => item.id === next[i]?.id && item.text === next[i]?.text);
        return same ? old : next;
      });
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) setActive(visible[0].target.id);
        },
        { rootMargin: "-120px 0px -65% 0px" },
      );
      for (const heading of headings) observer.observe(heading);
    };

    collect();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mutations = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(collect, 100);
    });
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      mutations.disconnect();
      observer?.disconnect();
    };
  }, [ref, key]);

  return { items, active };
}
