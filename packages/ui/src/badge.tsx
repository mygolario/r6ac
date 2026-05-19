import React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'clean' | 'flagged' | 'banned' | 'neutral';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => {
    const variants = {
      clean: 'bg-success/10 text-success border-success/20',
      flagged: 'bg-warning/10 text-warning border-warning/20',
      banned: 'bg-danger/10 text-danger border-danger/20',
      neutral: 'bg-surface-2 text-text-secondary border-border',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
