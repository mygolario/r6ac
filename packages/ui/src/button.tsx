import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from './utils';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark active:bg-red-800',
      secondary: 'bg-surface-2 text-text-primary hover:bg-border active:bg-surface border border-border',
      ghost: 'bg-transparent text-text-primary hover:bg-surface-2 active:bg-surface',
      danger: 'bg-danger text-white hover:bg-danger-dark active:bg-red-800',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        )}
        <span className={cn(isLoading && 'opacity-0', 'flex items-center justify-center w-full')}>
          {children}
        </span>
        {isLoading && (
           <span className="absolute flex items-center justify-center w-full h-full left-0 top-0">
             <Loader2 className="h-5 w-5 animate-spin" />
           </span>
        )}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
