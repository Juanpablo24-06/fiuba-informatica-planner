import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          "peer w-full min-w-0 appearance-none rounded-2xl border border-border/75 bg-surface-2 px-4 py-2.5 pr-10 text-sm font-medium text-text outline-none ring-1 ring-transparent transition focus:border-accent/65 focus:ring-accent/35",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted transition peer-focus:text-accent">
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>
  )
);

Select.displayName = "Select";
