import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full rounded-2xl border border-border/60 bg-canvas/70 px-4 py-2 text-sm text-text placeholder:text-muted outline-none ring-1 ring-transparent transition focus:ring-accent/60",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
