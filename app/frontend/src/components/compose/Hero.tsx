import { Sparkles } from "lucide-react";

export function Hero() {
  return (
    <div className="text-center">
      <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        Autonomous research agent
      </p>
      <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
        What do you want to research?
      </h1>
      <p className="mt-3 text-md text-muted-foreground">One question in. A cited report out.</p>
    </div>
  );
}
