import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeLocalStorage, safeSessionStorage } from "@/lib/storage";

export type MobileTab = "research" | "library" | "sources";

export const FONT_SIZES = [15, 16, 17, 18, 19, 21] as const;

interface UiStore {
  // Persisted preferences
  sidebarCollapsed: boolean;
  sourcesCollapsed: boolean;
  followLive: boolean;
  reportFontSize: number;
  // Session and transient UI state
  trustDismissed: boolean;
  sheetOpen: boolean;
  mobileTab: MobileTab;
  commandOpen: boolean;
  shortcutsOpen: boolean;
  howOpen: boolean;
  stopDialogOpen: boolean;
  highlightedSource: number | null;
  composeText: string;
  libraryFocusTick: number;

  toggleSidebar: () => void;
  toggleSources: () => void;
  setFollowLive: (on: boolean) => void;
  changeFontSize: (step: 1 | -1) => void;
  setTrustDismissed: (dismissed: boolean) => void;
  setSheetOpen: (open: boolean) => void;
  setMobileTab: (tab: MobileTab) => void;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setHowOpen: (open: boolean) => void;
  setStopDialogOpen: (open: boolean) => void;
  highlightSource: (n: number | null) => void;
  setComposeText: (text: string) => void;
  focusLibrarySearch: () => void;
}

const TRUST_KEY = "trust-banner-dismissed";
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sourcesCollapsed: false,
      followLive: true,
      reportFontSize: 17,
      trustDismissed: safeSessionStorage.getItem(TRUST_KEY) === "1",
      sheetOpen: false,
      mobileTab: "research",
      commandOpen: false,
      shortcutsOpen: false,
      howOpen: false,
      stopDialogOpen: false,
      highlightedSource: null,
      composeText: "",
      libraryFocusTick: 0,

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      toggleSources: () => set({ sourcesCollapsed: !get().sourcesCollapsed }),
      setFollowLive: (followLive) => set({ followLive }),
      changeFontSize: (step) => {
        const index = FONT_SIZES.findIndex((size) => size >= get().reportFontSize);
        const next = FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, index + step))];
        if (next) set({ reportFontSize: next });
      },
      setTrustDismissed: (trustDismissed) => {
        if (trustDismissed) safeSessionStorage.setItem(TRUST_KEY, "1");
        else safeSessionStorage.removeItem(TRUST_KEY);
        set({ trustDismissed });
      },
      setSheetOpen: (sheetOpen) => set({ sheetOpen }),
      setMobileTab: (mobileTab) => set({ mobileTab }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      setHowOpen: (howOpen) => set({ howOpen }),
      setStopDialogOpen: (stopDialogOpen) => set({ stopDialogOpen }),
      highlightSource: (n) => {
        clearTimeout(highlightTimer);
        set({ highlightedSource: n });
        if (n !== null) highlightTimer = setTimeout(() => set({ highlightedSource: null }), 2000);
      },
      setComposeText: (composeText) => set({ composeText }),
      focusLibrarySearch: () => set({ libraryFocusTick: get().libraryFocusTick + 1 }),
    }),
    {
      name: "deep-research-ui",
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sourcesCollapsed: state.sourcesCollapsed,
        followLive: state.followLive,
        reportFontSize: state.reportFontSize,
      }),
    },
  ),
);
