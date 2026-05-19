import { Sidebar, TopBar } from '@r6ac/ui';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export const MainLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('dashboard');
  const isRtl = i18n.language === 'fa';
  const { user, logout } = useAuthStore();

  const handleToggleLanguage = () => {
    const newLang = i18n.language === 'fa' ? 'en' : 'fa';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return t('navigation.dashboard');
    if (path.startsWith('/tournaments')) return t('navigation.tournaments');
    if (path.startsWith('/players')) return t('navigation.players');
    if (path.startsWith('/reports')) return t('navigation.reports');
    if (path.startsWith('/settings')) return t('navigation.settings');
    return '';
  };

  const usernameDisplay = user?.email ? user.email.split('@')[0] : isRtl ? 'مدیر سیستم' : 'Admin';
  const initials = usernameDisplay.substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full bg-bg text-text-primary overflow-hidden">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        activePath={location.pathname}
        onNavigate={(path) => navigate(path)}
        isRtl={isRtl}
        t={(key) => t(`navigation.${key}`)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar
          breadcrumb={getBreadcrumb()}
          onToggleLanguage={handleToggleLanguage}
          currentLang={i18n.language as 'fa' | 'en'}
          userName={usernameDisplay}
          userInitials={initials}
          onLogout={() => {
            logout();
            navigate('/login');
          }}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
