import React from 'react';
import { cn } from './utils';

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline' | 'inMatch' | 'banned';
  label?: string;
}

export const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, status, label, ...props }, ref) => {
    const statusColors = {
      online: 'bg-success',
      offline: 'bg-text-secondary',
      inMatch: 'bg-accent',
      banned: 'bg-danger',
    };

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
        <span className="relative flex h-2.5 w-2.5">
          {status === 'online' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          )}
          <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', statusColors[status])}></span>
        </span>
        {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
      </div>
    );
  }
);
StatusIndicator.displayName = 'StatusIndicator';
