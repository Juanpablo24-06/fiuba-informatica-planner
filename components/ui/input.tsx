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
        "w-full rounded-2xl border border-border/75 bg-surface-2 px-4 py-2 text-sm font-medium text-text placeholder:text-muted outline-none ring-1 ring-transparent transition focus:border-accent/65 focus:ring-accent/35",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
