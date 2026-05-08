import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "warning" }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-3 text-sm",
        variant === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        variant === "default" && "border-border bg-muted text-foreground",
        className
      )}
      {...props}
    />
  );
}
