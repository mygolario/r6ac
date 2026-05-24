import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@r6ac/ui';
import { motion } from 'framer-motion';
import { ShieldAlert, Loader2, Globe, ArrowLeft, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';

export const RegisterPage = () => {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleLanguage = () => {
    const newLang = i18n.language === 'fa' ? 'en' : 'fa';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !username) {
      setError(isRtl ? 'لطفاً تمامی فیلدها را پر کنید.' : 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, username }),
      });

      if (res.success && res.data) {
        // Redirect to login on success
        navigate('/login?registered=true');
      }
    } catch (err: any) {
      const msg = isRtl ? err?.error?.messageFA || 'ثبت‌نام ناموفق بود.' : err?.error?.message || 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-bg relative overflow-hidden">
      {/* Premium Split Layout: Left Image/Gradient, Right Form */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-1/50 flex-col items-center justify-center p-12 border-r border-border backdrop-blur-md z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/20 to-bg pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center space-y-6 max-w-lg"
        >
          <div className="w-24 h-24 rounded-3xl bg-accent/20 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(var(--accent),0.3)] backdrop-blur-xl border border-accent/30">
            <UserPlus className="w-12 h-12 text-accent" />
          </div>
          <h1 className="text-4xl font-black text-text font-vazir tracking-tight">
            {isRtl ? 'به R6AC بپیوندید' : 'Join R6AC'}
          </h1>
          <p className="text-lg text-text-secondary font-vazir leading-relaxed">
            {isRtl 
              ? 'پیشرفته‌ترین پلتفرم مدیریت مسابقات و آنتی‌چیت را تجربه کنید. حساب کاربری خود را بسازید و وارد رقابت شوید.' 
              : 'Experience the most advanced tournament management and anti-cheat platform. Create your account and enter the competition.'}
          </p>
        </motion.div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-20">
        {/* Decorative Gradients for Mobile */}
        <div className="lg:hidden absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="lg:hidden absolute bottom-1/4 right-1/4 w-96 h-96 bg-danger/10 rounded-full blur-3xl pointer-events-none" />

        {/* Language Toggle */}
        <div className="absolute top-6 right-6">
          <Button variant="secondary" size="sm" onClick={handleToggleLanguage} className="flex items-center gap-2 font-vazir bg-surface-1/80 backdrop-blur border border-border/50">
            <Globe className="w-4 h-4 text-accent" />
            <span>{isRtl ? 'English' : 'فارسی'}</span>
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <Card className="border-border/50 bg-surface-1/60 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-accent to-danger" />
            <CardHeader className="text-center space-y-2 pb-6 pt-8">
              <CardTitle className="text-2xl font-bold tracking-tight font-vazir">
                {isRtl ? 'ایجاد حساب کاربری' : 'Create an Account'}
              </CardTitle>
              <p className="text-sm text-text-secondary font-vazir">
                {isRtl ? 'برای دسترسی به مسابقات، اطلاعات خود را وارد کنید.' : 'Enter your details to access tournaments.'}
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleRegister} className="space-y-5">
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm font-vazir flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary font-vazir uppercase tracking-wider">
                    {isRtl ? 'نام کاربری' : 'Username'}
                  </label>
                  <Input
                    type="text"
                    placeholder="player123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="font-mono text-left bg-bg/50 border-border/50 focus:bg-bg transition-colors h-11"
                    dir="ltr"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary font-vazir uppercase tracking-wider">
                    {isRtl ? 'آدرس ایمیل' : 'Email Address'}
                  </label>
                  <Input
                    type="email"
                    placeholder="player@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono text-left bg-bg/50 border-border/50 focus:bg-bg transition-colors h-11"
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary font-vazir uppercase tracking-wider">
                    {isRtl ? 'رمز عبور' : 'Password'}
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono text-left bg-bg/50 border-border/50 focus:bg-bg transition-colors h-11"
                    dir="ltr"
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full font-vazir font-bold mt-4 h-12 text-sm shadow-[0_0_20px_rgba(var(--accent),0.3)] hover:shadow-[0_0_30px_rgba(var(--accent),0.5)] transition-all" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRtl ? 'ثبت‌نام' : 'Sign Up')}
                </Button>
              </form>

              <div className="mt-8 text-center flex flex-col items-center gap-4">
                <Link to="/login" className="text-sm text-text-secondary hover:text-accent font-vazir flex items-center gap-2 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  {isRtl ? 'بازگشت به صفحه ورود' : 'Back to Login'}
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
