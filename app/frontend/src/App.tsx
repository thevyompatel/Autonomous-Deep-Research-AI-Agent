import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLayout } from "@/hooks/useMediaQuery";
import { useThemeSync } from "@/hooks/useTheme";
import { queryClient } from "@/lib/queryClient";

export default function App() {
  const theme = useThemeSync();
  const layout = useLayout();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300} skipDelayDuration={150}>
        <AppShell />
        <Toaster theme={theme} position={layout === "mobile" ? "top-center" : "bottom-right"} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
