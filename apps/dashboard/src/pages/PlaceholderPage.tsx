import React from 'react';
import { useTranslation } from 'react-i18next';

export const PlaceholderPage = ({ titleKey }: { titleKey: string }) => {
  const { t, i18n } = useTranslation('dashboard');
  const isRtl = i18n.language === 'fa';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{t(`navigation.${titleKey}` as string)}</h1>
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-xl">
        <p className="text-text-muted text-lg">{isRtl ? 'به زودی...' : 'Coming Soon...'}</p>
      </div>
    </div>
  );
};
