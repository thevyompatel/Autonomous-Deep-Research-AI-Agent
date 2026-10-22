import { useMemo, useSyncExternalStore } from "react";

/** Hash routes keep the Python server simple: it only ever serves index.html at "/". */
export type Route = { name: "compose" } | { name: "run" } | { name: "report"; report: string };

const REPORT = /^#\/report\/([a-z0-9][a-z0-9-]*)$/;

export function parseHash(hash: string): Route {
  if (hash === "#/run") return { name: "run" };
  const match = REPORT.exec(hash);
  if (match?.[1]) return { name: "report", report: match[1] };
  return { name: "compose" };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case "compose":
      return "#/";
    case "run":
      return "#/run";
    case "report":
      return `#/report/${route.report}`;
  }
}

export function navigate(route: Route, { replace = false } = {}): void {
  const hash = routeHash(route);
  if (window.location.hash === hash) return;
  if (replace) {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}

export function reportLink(name: string): string {
  return `${window.location.origin}${window.location.pathname}${routeHash({ name: "report", report: name })}`;
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    () => window.location.hash,
    () => "",
  );
  return useMemo(() => parseHash(hash), [hash]);
}
