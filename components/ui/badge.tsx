import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/75 bg-surface-2 px-3 py-1 text-xs font-medium text-muted",
        className
      )}
      {...props}
    />
  );
}
