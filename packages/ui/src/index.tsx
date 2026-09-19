import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@devpulse/utils';

const buttonVariants = cva('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { primary: 'bg-devpulse-purple text-white hover:bg-violet-500', ghost: 'text-devpulse-text hover:bg-white/10' },
    size: { sm: 'h-8 px-3', md: 'h-10 px-4', lg: 'h-12 px-6' }
  },
  defaultVariants: { variant: 'primary', size: 'md' }
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Component = asChild ? Slot : 'button';
  return <Component ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
Button.displayName = 'Button';
export { cn };
