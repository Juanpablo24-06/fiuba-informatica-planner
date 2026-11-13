import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "border border-accent bg-accent text-accent-contrast shadow-soft hover:brightness-95",
        outline: "border border-border/75 bg-surface-2 text-text hover:border-accent/50 hover:text-text",
        ghost: "border border-transparent text-muted hover:bg-surface-2 hover:text-text"
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2",
        lg: "px-5 py-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);

Button.displayName = "Button";
