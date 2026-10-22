import { useEffect, useRef } from "react";

export interface Hotkey {
  /** "mod+k", "n", "/", "?", "escape", "[" or a two-key sequence like "g l". */
  keys: string;
  handler: (event: KeyboardEvent) => void;
  /** Fire even while typing in an input or textarea. */
  allowInInputs?: boolean;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function matches(spec: string, event: KeyboardEvent): boolean {
  const parts = spec.toLowerCase().split("+");
  const key = parts.pop();
  const wantsMod = parts.includes("mod");
  const hasMod = event.metaKey || event.ctrlKey;
  if (wantsMod !== hasMod) return false;
  if (!wantsMod && event.altKey) return false;
  return event.key.toLowerCase() === key;
}

/** Global keyboard shortcuts with support for "g then l" style sequences. */
export function useHotkeys(hotkeys: Hotkey[]): void {
  const ref = useRef(hotkeys);
  ref.current = hotkeys;

  useEffect(() => {
    let prefix: string | null = null;
    let prefixTimer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const typing = isTyping(event.target);
      for (const hotkey of ref.current) {
        if (typing && !hotkey.allowInInputs) continue;
        const sequence = hotkey.keys.split(" ");
        if (sequence.length === 2) {
          if (prefix === sequence[0] && matches(sequence[1] ?? "", event)) {
            prefix = null;
            event.preventDefault();
            hotkey.handler(event);
            return;
          }
        } else if (matches(hotkey.keys, event)) {
          event.preventDefault();
          hotkey.handler(event);
          return;
        }
      }
      // Remember a possible sequence prefix ("g") for one second.
      if (!typing && !event.metaKey && !event.ctrlKey && event.key.length === 1) {
        prefix = event.key.toLowerCase();
        clearTimeout(prefixTimer);
        prefixTimer = setTimeout(() => (prefix = null), 1000);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(prefixTimer);
    };
  }, []);
}
