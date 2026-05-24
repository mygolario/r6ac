import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@r6ac/ui';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, Globe, LogIn } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';

export const LoginPage = () => {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('registered') === 'true') {
      setSuccessMsg(isRtl ? 'ثبت‌نام با موفقیت انجام شد. لطفاً وارد شوید.' : 'Registration successful. Please log in.');
    }
  }, [location, isRtl]);

  const handleToggleLanguage = () => {
    const newLang = i18n.language === 'fa' ? 'en' : 'fa';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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
    <div className="flex min-h-screen w-full bg-bg relative overflow-hidden">
      {/* Premium Split Layout: Left Form, Right Image/Gradient */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-20">
        
        {/* Decorative Gradients for Mobile */}
        <div className="lg:hidden absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="lg:hidden absolute bottom-1/4 right-1/4 w-96 h-96 bg-danger/10 rounded-full blur-3xl pointer-events-none" />

        {/* Language Toggle */}
        <div className="absolute top-6 left-6 lg:left-auto lg:right-6">
          <Button variant="secondary" size="sm" onClick={handleToggleLanguage} className="flex items-center gap-2 font-vazir bg-surface-1/80 backdrop-blur border border-border/50">
            <Globe className="w-4 h-4 text-accent" />
            <span>{isRtl ? 'English' : 'فارسی'}</span>
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <Card className="border-border/50 bg-surface-1/60 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-danger to-accent" />
            <CardHeader className="text-center space-y-2 pb-6 pt-8">
              <CardTitle className="text-2xl font-bold tracking-tight font-vazir">
                {t('auth.title', { defaultValue: isRtl ? 'ورود به پنل مدیریت R6AC' : 'Welcome back to R6AC' })}
              </CardTitle>
              <p className="text-sm text-text-secondary font-vazir">
                {t('auth.subtitle', { defaultValue: isRtl ? 'جهت مدیریت مسابقات و تخلفات وارد شوید' : 'Enter your credentials to access the system' })}
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-vazir flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm font-vazir flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary font-vazir uppercase tracking-wider">
                    {t('auth.email', { defaultValue: isRtl ? 'آدرس ایمیل' : 'Email Address' })}
                  </label>
                  <Input
                    type="email"
                    placeholder="admin@r6ac.ir"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono text-left bg-bg/50 border-border/50 focus:bg-bg transition-colors h-11"
                    dir="ltr"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary font-vazir uppercase tracking-wider">
                    {t('auth.password', { defaultValue: isRtl ? 'رمز عبور' : 'Password' })}
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono text-left bg-bg/50 border-border/50 focus:bg-bg transition-colors h-11"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full font-vazir font-bold mt-4 h-12 text-sm shadow-[0_0_20px_rgba(var(--accent),0.3)] hover:shadow-[0_0_30px_rgba(var(--accent),0.5)] transition-all" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.submit', { defaultValue: isRtl ? 'ورود به حساب' : 'Sign In' })}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50 text-center flex flex-col items-center gap-4">
                <Link to="/register" className="text-sm text-text-secondary hover:text-accent font-vazir transition-colors">
                  {isRtl ? 'حساب کاربری ندارید؟ ثبت‌نام کنید' : "Don't have an account? Sign up"}
                </Link>
                <Button variant="secondary" size="sm" onClick={handleMockAdminLogin} className="w-full text-xs font-vazir bg-surface-2 hover:bg-surface-3">
                  {isRtl ? 'ورود مستقیم به عنوان مدیر کل (Mock Admin)' : 'Direct Access as Super Admin (Mock)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Premium Split Layout: Right Side Graphics */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-1/50 flex-col items-center justify-center p-12 border-l border-border backdrop-blur-md z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-danger/20 to-bg pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center space-y-6 max-w-lg"
        >
          <div className="w-24 h-24 rounded-3xl bg-danger/20 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(var(--danger),0.3)] backdrop-blur-xl border border-danger/30">
            <LogIn className="w-12 h-12 text-danger" />
          </div>
          <h1 className="text-4xl font-black text-text font-vazir tracking-tight">
            {isRtl ? 'امنیت و کنترل مطلق' : 'Absolute Security & Control'}
          </h1>
          <p className="text-lg text-text-secondary font-vazir leading-relaxed">
            {isRtl 
              ? 'ورود امن به پنل مدیریت برای بررسی تخلفات، مدیریت مسابقات، و نظارت بر سلامت بازی‌ها در لحظه.' 
              : 'Secure access to your management portal to investigate violations, manage tournaments, and monitor game integrity in real-time.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
