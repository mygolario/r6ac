import React from 'react';
import { cn } from './utils';
import { LayoutDashboard, Trophy, Users, ShieldAlert, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean;
  onToggle?: () => void;
  activePath?: string;
  onNavigate?: (path: string) => void;
  isRtl?: boolean;
  t?: (key: string) => string;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      isCollapsed = false,
      onToggle,
      activePath = '/',
      onNavigate,
      isRtl = true,
      t = (key: string) => key,
      ...props
    },
    ref
  ) => {
    const navItems = [
      { path: '/', icon: LayoutDashboard, label: t('dashboard') },
      { path: '/tournaments', icon: Trophy, label: t('tournaments') },
      { path: '/players', icon: Users, label: t('players') },
      { path: '/reports', icon: ShieldAlert, label: t('reports') },
      { path: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
      <aside
        ref={ref}
        className={cn(
          'flex flex-col h-screen border-e border-border bg-surface transition-all duration-300 relative',
          isCollapsed ? 'w-20' : 'w-64',
          className
        )}
        {...props}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2 font-bold text-xl text-primary overflow-hidden">
              R6AC
            </div>
          )}
          {isCollapsed && (
            <div className="flex w-full items-center justify-center font-bold text-xl text-primary">
              R6
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className="absolute -end-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary z-10 focus:outline-none"
        >
          {isRtl ? (
            isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="flex flex-col gap-2 px-3">
            {navItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => onNavigate?.(item.path)}
                    className={cn(
                      'flex items-center w-full gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                      isCollapsed && 'justify-center px-0'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    );
  }
);
Sidebar.displayName = 'Sidebar';
