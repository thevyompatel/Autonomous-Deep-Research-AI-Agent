import { navigate } from "@/hooks/useHashRoute";
import { useUiStore } from "@/store/uiStore";

/** Go to the question box and focus it. */
export function goToCompose(): void {
  navigate({ name: "compose" });
  useUiStore.getState().setMobileTab("research");
  setTimeout(() => document.getElementById("question")?.focus(), 50);
}
