import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hideChevron?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, hideChevron, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          "peer w-full min-w-0 appearance-none rounded-2xl border border-border/75 bg-gradient-to-b from-surface to-surface-2 px-4 py-2.5 text-sm font-medium text-text shadow-[inset_0_1px_0_rgb(var(--color-surface)/0.7)] outline-none ring-1 ring-transparent transition-all duration-200 hover:border-border focus:border-accent/65 focus:ring-accent/35 disabled:cursor-not-allowed disabled:opacity-60",
          hideChevron ? "pr-4" : "pr-11",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {!hideChevron && (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/75 bg-surface text-muted transition peer-focus:border-accent/45 peer-focus:text-accent">
            <ChevronDown className="h-4 w-4" />
          </span>
        </span>
      )}
    </div>
  )
);

Select.displayName = "Select";
