import { ShieldAlert, X } from "lucide-react";
import type { ReportMeta } from "@/api/types";
import { scoreTone } from "@/lib/score";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber, plural, readingMinutes } from "@/lib/format";
import { useUiStore } from "@/store/uiStore";

interface ReportHeaderProps {
  title: string;
  modified: string;
  words: number;
  sourceCount: number;
  revised: boolean;
  meta: ReportMeta | null | undefined;
  question?: string;
}

export function ReportHeader({ title, modified, words, sourceCount, revised, meta, question }: ReportHeaderProps) {
  const asked = meta?.question ?? question;
  const score = meta?.final_score;
  return (
    <header className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Research report</p>
      <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {asked && (
        <p className="mt-3 text-md text-muted-foreground">
          <span className="font-medium text-foreground">Question:</span> {asked}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <time dateTime={modified} className="mr-1 text-sm text-muted-foreground">
          {formatDate(modified)}
        </time>
        {typeof meta?.iterations === "number" ? (
          <Badge variant="outline">{plural(meta.iterations, "iteration")}</Badge>
        ) : (
          revised && <Badge variant="primary">Revised by review loop</Badge>
        )}
        {typeof score === "number" && (
          <Badge variant="outline">
            Final score <span className={scoreTone(score).text}>{score}/10</span>
          </Badge>
        )}
        <Badge variant="outline">{plural(sourceCount, "source")}</Badge>
        <Badge variant="outline">{formatNumber(words)} words</Badge>
        <Badge variant="muted">{readingMinutes(words)} min read</Badge>
      </div>
    </header>
  );
}

/** Dismissible for this browser session; the toolbar's info button brings it back. */
export function TrustBanner() {
  const dismissed = useUiStore((s) => s.trustDismissed);
  const setDismissed = useUiStore((s) => s.setTrustDismissed);
  if (dismissed) return null;
  return (
    <Alert variant="info" className="mb-8 print:hidden">
      <ShieldAlert />
      <p className="flex-1">
        <span className="font-medium">Reports can contain errors.</span> The agent only checks claims against the pages it
        scraped. Open the cited sources before relying on anything.
      </p>
      <Button variant="ghost" size="icon-sm" className="-my-1 -mr-2" onClick={() => setDismissed(true)} aria-label="Dismiss this notice">
        <X />
      </Button>
    </Alert>
  );
}
