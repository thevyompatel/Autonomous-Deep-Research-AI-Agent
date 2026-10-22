import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export type Layout = "mobile" | "tablet" | "desktop";

/** Desktop >= 1100px (three zones), tablet 700-1099px (drawer), mobile < 700px (bottom tabs). */
export function useLayout(): Layout {
  const desktop = useMediaQuery("(min-width: 1100px)");
  const tablet = useMediaQuery("(min-width: 700px)");
  return desktop ? "desktop" : tablet ? "tablet" : "mobile";
}
