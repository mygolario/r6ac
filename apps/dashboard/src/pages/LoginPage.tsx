import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@r6ac/ui';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, Globe } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

export const LoginPage = () => {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleLanguage = () => {
    const newLang = i18n.language === 'fa' ? 'en' : 'fa';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(isRtl ? 'لطفاً ایمیل و رمز عبور را وارد کنید.' : 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
        useAuthStore.getState().setAuth(res.data.user, res.data.accessToken);
        navigate('/');
      }
    } catch (err: any) {
      const msg = isRtl ? err?.error?.messageFA || 'ورود ناموفق بود.' : err?.error?.message || 'Login failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMockAdminLogin = () => {
    useAuthStore.getState().setAuth(
      {
        id: 'admin_1',
        email: 'admin@r6ac.ir',
        role: 'super_admin',
        banStatus: 'clean',
      },
      'mock_access_token_super_admin'
    );
    navigate('/');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg relative overflow-hidden p-4">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-danger/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Toggle */}
      <div className="absolute top-6 right-6">
        <Button variant="secondary" size="sm" onClick={handleToggleLanguage} className="flex items-center gap-2 font-vazir">
          <Globe className="w-4 h-4 text-accent" />
          <span>{isRtl ? 'English' : 'فارسی'}</span>
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="w-full max-w-md">
        <Card className="border-border bg-surface-1/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-2 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight font-vazir">
              {t('auth.title', { defaultValue: isRtl ? 'ورود به پنل مدیریت R6AC' : 'Login to R6AC Portal' })}
            </CardTitle>
            <p className="text-xs text-text-secondary font-vazir">
              {t('auth.subtitle', { defaultValue: isRtl ? 'جهت مدیریت مسابقات و تخلفات وارد شوید' : 'Enter your credentials to access the system' })}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-vazir flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary font-vazir">
                  {t('auth.email', { defaultValue: isRtl ? 'آدرس ایمیل' : 'Email Address' })}
                </label>
                <Input
                  type="email"
                  placeholder="admin@r6ac.ir"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-mono text-left"
                  dir="ltr"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary font-vazir">
                  {t('auth.password', { defaultValue: isRtl ? 'رمز عبور' : 'Password' })}
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono text-left"
                  dir="ltr"
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full font-vazir font-bold mt-2 h-11" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.submit', { defaultValue: isRtl ? 'ورود به حساب' : 'Sign In' })}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-xs text-text-secondary font-vazir mb-3">
                {isRtl ? 'دسترسی سریع برای محیط تست:' : 'Quick access for development / evaluation:'}
              </p>
              <Button variant="secondary" size="sm" onClick={handleMockAdminLogin} className="w-full text-xs font-vazir">
                {isRtl ? 'ورود مستقیم به عنوان مدیر کل (Mock Admin)' : 'Direct Access as Super Admin'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
