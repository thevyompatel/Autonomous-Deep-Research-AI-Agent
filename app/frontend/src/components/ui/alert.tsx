import type * as React from "react";
import { cn } from "@/lib/cn";

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "warning" | "danger" | "info" | "success" }) {
  const tone = {
    default: "border-border bg-card text-foreground",
    warning: "border-warning/30 bg-warning/[0.07] text-foreground [&>svg]:text-warning",
    danger: "border-destructive/30 bg-destructive/[0.07] text-foreground [&>svg]:text-destructive",
    info: "border-info/25 bg-info/[0.07] text-foreground [&>svg]:text-info",
    success: "border-success/25 bg-success/[0.07] text-foreground [&>svg]:text-success",
  }[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn(
        "relative flex gap-3 rounded-lg border px-4 py-3 text-base [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        tone,
        className,
      )}
      {...props}
    />
  );
}
