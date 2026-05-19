import React from 'react';
import { cn } from './utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'clean' | 'flagged' | 'banned';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, initials, size = 'md', status, ...props }, ref) => {
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    };

    const statusRings = {
      clean: 'ring-2 ring-success',
      flagged: 'ring-2 ring-warning',
      banned: 'ring-2 ring-danger',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full bg-surface-2 text-text-primary',
          sizes[size],
          status && statusRings[status],
          className
        )}
        {...props}
      >
        {src ? (
          <img className="aspect-square h-full w-full object-cover" src={src} alt="Avatar" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-medium">
            {initials || '?'}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
