import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@devpulse/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500 focus-visible:ring-offset-[#09090e] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-devpulse-purple text-white hover:bg-violet-600 shadow-md shadow-violet-900/30",
        secondary:
          "bg-[#141420] text-[#ededf5] hover:bg-[#1d1d2e] border border-[#252538] hover:border-[#383852]",
        destructive:
          "bg-[#2a1215] text-[#f87171] hover:bg-[#3b171c] border border-[#7f1d1d]/40 hover:border-[#f87171]/50",
        outline:
          "border border-[#262638] text-[#c4c4dc] hover:bg-white/5 hover:text-white",
        ghost: "text-[#8e8ea6] hover:text-white hover:bg-white/10",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-xs",
        lg: "h-11 px-5 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Component>
    );
  },
);
Button.displayName = "Button";
export { cn, buttonVariants };
