import { useEffect, useState, type RefObject } from "react";

/** Width of an element, tracked with ResizeObserver. Change `key` when the element remounts. */
export function useElementWidth(ref: RefObject<HTMLElement>, key?: unknown): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, key]);
  return width;
}
