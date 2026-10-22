import { RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/useNow";
import { retryNow } from "@/hooks/useRunStream";
import { useBackendHealth } from "@/hooks/useUsage";
import { useRunStore } from "@/store/runStore";

function Bar({ tone, children, action }: { tone: "warning" | "danger"; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        tone === "warning"
          ? "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm print:hidden"
          : "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm print:hidden"
      }
    >
      <WifiOff className={tone === "warning" ? "size-4 text-warning" : "size-4 text-destructive"} aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

/** Shown while a dropped run stream is reconnecting, otherwise while the server is unreachable. */
export function Banners() {
  const connection = useRunStore((s) => s.connection);
  const health = useBackendHealth();
  const reconnecting = connection.status === "reconnecting";
  const now = useNow(500, reconnecting);

  if (reconnecting) {
    const seconds = Math.max(0, Math.ceil(((connection.retryAt ?? now) - now) / 1000));
    return (
      <Bar
        tone="warning"
        action={
          <Button size="sm" variant="outline" onClick={retryNow}>
            <RotateCcw /> Retry now
          </Button>
        }
      >
        Connection lost. {seconds > 0 ? `Retrying in ${seconds}s…` : "Reconnecting…"}{" "}
        <span className="text-muted-foreground">The agent keeps running on the server for 20 s while you reconnect.</span>
      </Bar>
    );
  }

  if (health.online === false) {
    return (
      <Bar
        tone="danger"
        action={
          <Button size="sm" variant="outline" onClick={health.retryNow}>
            <RotateCcw /> Retry
          </Button>
        }
      >
        Can&apos;t reach the research server at {window.location.host}.{" "}
        {health.retryIn !== null && health.retryIn > 0 ? `Retrying in ${health.retryIn}s.` : "Retrying…"}{" "}
        <span className="text-muted-foreground">Is python -m app.web still running?</span>
      </Bar>
    );
  }

  return null;
}
