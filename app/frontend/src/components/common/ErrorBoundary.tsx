import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  children: ReactNode;
  /** Shown in the fallback, e.g. "the report". */
  label: string;
}

interface State {
  error: Error | null;
}

/** Keeps a crash in one view from blanking the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Error in ${this.props.label}`, error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-10 max-w-lg rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-md font-semibold">Something went wrong showing {this.props.label}</h2>
            <p className="text-muted-foreground">
              The rest of the app still works. Try reloading this view; if it keeps happening, reload the page.
            </p>
            <Collapsible>
              <CollapsibleTrigger className="text-sm text-muted-foreground underline underline-offset-4">
                Technical details
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {error.message}
                </pre>
              </CollapsibleContent>
            </Collapsible>
            <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
              <RotateCcw /> Reload view
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
