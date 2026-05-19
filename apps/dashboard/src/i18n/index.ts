import { resources } from '@r6ac/i18n';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fa',
    fallbackLng: 'en',
    ns: ['common', 'dashboard', 'auth'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, 
    },
  });

export default i18n;
