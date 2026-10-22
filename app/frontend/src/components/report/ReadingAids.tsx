import { useEffect, useState, type RefObject } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prefersReducedMotion } from "@/lib/browser";
import { cn } from "@/lib/cn";

/** Thin bar at the very top showing how far through the article the reader is. */
export function ReadingProgress({ target }: { target: RefObject<HTMLElement> }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = target.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const total = rect.height - window.innerHeight + 140;
        setProgress(total > 0 ? Math.min(1, Math.max(0, (140 - rect.top) / total)) : 1);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [target]);
  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="fixed inset-x-0 top-0 z-40 h-0.5 print:hidden"
    >
      <div className="h-full origin-left bg-primary transition-transform duration-100" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

export function BackToTop({ aboveTabBar }: { aboveTabBar?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 600);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
      className={cn(
        "fixed right-5 z-20 rounded-full shadow-soft transition-[opacity,transform] duration-200 print:hidden",
        aboveTabBar ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp />
    </Button>
  );
}
