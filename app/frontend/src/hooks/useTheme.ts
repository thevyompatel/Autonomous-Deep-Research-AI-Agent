import { useEffect } from "react";
import { create } from "zustand";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { safeLocalStorage } from "@/lib/storage";

export type Theme = "light" | "dark" | "system";

const KEY = "theme";

function readTheme(): Theme {
  const saved = safeLocalStorage.getItem(KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

const useThemeStore = create<{ theme: Theme; setTheme: (theme: Theme) => void }>()((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    if (theme === "system") safeLocalStorage.removeItem(KEY);
    else safeLocalStorage.setItem(KEY, theme);
    set({ theme });
  },
}));

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const resolved: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;
  const toggle = () => setTheme(resolved === "dark" ? "light" : "dark");
  return { theme, resolved, setTheme, toggle };
}

/** Keep the <html> class in sync with the chosen theme and the OS setting. */
export function useThemeSync(): "light" | "dark" {
  const { resolved } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);
  return resolved;
}
