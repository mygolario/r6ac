import React from 'react';
import { cn } from './utils';
import { Bell, Globe, LogOut } from 'lucide-react';
import { Avatar } from './avatar';

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  breadcrumb?: string;
  onToggleLanguage?: () => void;
  currentLang?: 'fa' | 'en';
  userName?: string;
  userInitials?: string;
  onLogout?: () => void;
}

export const TopBar = React.forwardRef<HTMLElement, TopBarProps>(
  (
    {
      className,
      breadcrumb,
      onToggleLanguage,
      currentLang = 'fa',
      userName = 'User',
      userInitials = 'U',
      onLogout,
      ...props
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'flex h-16 items-center justify-between border-b border-border bg-surface px-6 font-vazir',
          className
        )}
        {...props}
      >
        <div className="flex items-center text-sm font-medium text-text-secondary font-vazir">
          {breadcrumb}
        </div>

        <div className="flex items-center gap-4 font-vazir">
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none font-vazir"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase font-mono">{currentLang}</span>
          </button>

          <button className="relative text-text-secondary hover:text-text-primary transition-colors focus:outline-none">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 end-0 h-2 w-2 rounded-full bg-primary" />
          </button>

          <div className="h-6 w-px bg-border mx-1" />

          <div className="flex items-center gap-2 font-vazir">
            <span className="text-sm font-medium text-text-primary hidden sm:inline-block font-vazir">
              {userName}
            </span>
            <Avatar initials={userInitials} size="sm" />
            {onLogout && (
              <button
                onClick={onLogout}
                title="خروج از حساب"
                className="p-1 text-text-secondary hover:text-danger rounded transition-colors ms-1"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }
);
TopBar.displayName = 'TopBar';
