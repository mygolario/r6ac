import { Button } from '@r6ac/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl text-text-secondary">
        {isRtl ? 'صفحه مورد نظر یافت نشد.' : 'Page not found.'}
      </p>
      <Button onClick={() => navigate('/')}>
        {isRtl ? 'بازگشت به داشبورد' : 'Back to Dashboard'}
      </Button>
    </div>
  );
};
