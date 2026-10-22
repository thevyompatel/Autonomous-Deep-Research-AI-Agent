/** Storage that never throws (private mode, blocked site data, previews). */
function safe(getStore: () => Storage) {
  return {
    getItem(key: string): string | null {
      try {
        return getStore().getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        getStore().setItem(key, value);
      } catch {
        /* storage unavailable; the app keeps working without it */
      }
    },
    removeItem(key: string): void {
      try {
        getStore().removeItem(key);
      } catch {
        /* storage unavailable */
      }
    },
  };
}

export const safeLocalStorage = safe(() => window.localStorage);
export const safeSessionStorage = safe(() => window.sessionStorage);
