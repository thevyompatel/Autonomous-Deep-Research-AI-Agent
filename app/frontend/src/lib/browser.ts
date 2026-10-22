/** Favicon badge, notifications and clipboard: small browser integrations. */

const ICON = (badge: boolean) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4f46e5"/><circle cx="14" cy="14" r="6.5" fill="none" stroke="white" stroke-width="3"/><path d="M19 19l6 6" stroke="white" stroke-width="3" stroke-linecap="round"/>${
      badge ? '<circle cx="26" cy="6" r="6" fill="#22c55e" stroke="white" stroke-width="2"/>' : ""
    }</svg>`,
  )}`;

export function setFaviconBadge(on: boolean): void {
  const link = document.getElementById("favicon");
  if (link instanceof HTMLLinkElement) link.href = ICON(on);
}

export function requestNotificationPermission(): void {
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => undefined);
  }
}

export function notify(title: string, body: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, { body, tag: "deep-research" });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function scrollIntoViewSmooth(element: Element | null, block: ScrollLogicalPosition = "center"): void {
  element?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block });
}
