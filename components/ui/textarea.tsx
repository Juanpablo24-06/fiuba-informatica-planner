import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[100px] w-full rounded-2xl border border-border/60 bg-canvas/70 px-4 py-2 text-sm text-text placeholder:text-muted outline-none ring-1 ring-transparent transition focus:ring-accent/60",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
