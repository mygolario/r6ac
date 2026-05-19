import { DetectionType } from '@r6ac/types';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@r6ac/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Image, Sliders, Check, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Detection Type list
const DETECTION_TYPES: DetectionType[] = [
  'AIMBOT', 'WALLHACK', 'RADAR_HACK', 'TRIGGER_BOT', 'NO_RECOIL', 'SPEED_HACK',
  'SPOOFER', 'DMA_CARD', 'KMBOX', 'ARDUINO_INPUT', 'DUAL_PC_STREAM', 'MACRO_PATTERN',
  'STATISTICAL_OUTLIER'
];

export const SettingsPage = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';

  const [activeTab, setActiveTab] = useState<'general' | 'tournament' | 'anticheat' | 'admins'>('general');

  // General Settings State
  const [platformName, setPlatformName] = useState('R6AC Anti-Cheat');
  const [langDefault, setLangDefault] = useState<'fa' | 'en'>('fa');

  // Tournament Settings State
  const [defaultMaxTeams, setDefaultMaxTeams] = useState(16);
  const [defaultFormat, setDefaultFormat] = useState('BO3');
  const [feeCurrency, setFeeCurrency] = useState<'IRR' | 'USDT'>('IRR');

  // Anti-Cheat State
  const [autoFlag, setAutoFlag] = useState(0.75);
  const [autoKick, setAutoKick] = useState(0.92);
  const [autoKickEnabled, setAutoKickEnabled] = useState(true);
  const [enabledDetections, setEnabledDetections] = useState<Record<DetectionType, boolean>>(
    DETECTION_TYPES.reduce((acc, dt) => ({ ...acc, [dt]: true }), {} as Record<DetectionType, boolean>)
  );

  // Admin Account List state
  const [adminsList, setAdminsList] = useState([
    { id: 'adm_1', username: 'ario_admin', role: 'super_admin', name: 'آریو' },
    { id: 'adm_2', username: 'mamad_ref', role: 'tournament_admin', name: 'محمد' },
    { id: 'adm_3', username: 'reza_sec', role: 'tournament_admin', name: 'رضا' },
  ]);

  const handleToggleDetection = (type: DetectionType) => {
    setEnabledDetections((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleAddAdmin = () => {
    const newAdmin = {
      id: `adm_${Date.now()}`,
      username: 'new_admin',
      role: 'tournament_admin' as const,
      name: isRtl ? 'ادمین جدید' : 'New Admin',
    };
    setAdminsList((prev) => [...prev, newAdmin]);
  };

  const handleRemoveAdmin = (id: string) => {
    if (adminsList.length <= 1) return; // safety check
    setAdminsList((prev) => prev.filter((adm) => adm.id !== id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-vazir">{t('settings.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {isRtl ? 'پیکربندی پلتفرم، قوانین تورنمنت‌ها و حد آستانه اعمال خودکار آنتی‌چیت' : 'Configure platform name, tournament formats, and anti-cheat thresholds'}
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center border-b border-border gap-2 overflow-x-auto">
        {(['general', 'tournament', 'anticheat', 'admins'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold font-vazir border-b-2 transition-all duration-200 ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'general' && t('settings.tabGeneral')}
            {tab === 'tournament' && t('settings.tabTournament')}
            {tab === 'anticheat' && t('settings.tabAntiCheat')}
            {tab === 'admins' && t('settings.tabAdmins')}
          </button>
        ))}
      </div>

      {/* Settings body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          {/* TAB 1: General Settings */}
          {activeTab === 'general' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Platform Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary font-vazir">
                      {t('settings.platformName')}
                    </label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={(e) => setPlatformName(e.target.value)}
                      className="h-10 px-3 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent font-bold"
                    />
                  </div>

                  {/* Language Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary font-vazir">
                      {t('settings.languageToggle')}
                    </label>
                    <div className="grid grid-cols-2 gap-2 h-10">
                      <button
                        onClick={() => setLangDefault('fa')}
                        className={`h-full border rounded-md font-semibold text-xs font-vazir transition-all ${
                          langDefault === 'fa'
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        فارسی (FA)
                      </button>
                      <button
                        onClick={() => setLangDefault('en')}
                        className={`h-full border rounded-md font-semibold text-xs transition-all ${
                          langDefault === 'en'
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        English (EN)
                      </button>
                    </div>
                  </div>

                  {/* Logo upload slot */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary font-vazir">
                      {t('settings.logoUpload')}
                    </label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-surface-2/20">
                      <div className="p-3 bg-accent/10 border border-accent/20 rounded-full text-accent">
                        <Image className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-text-primary font-vazir">
                          {t('settings.logoUploadDesc')}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">PNG, JPG up to 2MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end">
                  <Button variant="primary" className="font-vazir text-xs">
                    {isRtl ? 'ذخیره تغییرات عمومی' : 'Save General Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Tournament Settings */}
          {activeTab === 'tournament' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Default Max Teams */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary font-vazir">
                      {t('settings.defaultMaxTeams')}
                    </label>
                    <select
                      value={defaultMaxTeams}
                      onChange={(e) => setDefaultMaxTeams(parseInt(e.target.value))}
                      className="h-10 px-3 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent font-vazir font-semibold"
                    >
                      <option value="8">۸ تیم (8 Teams)</option>
                      <option value="16">۱۶ تیم (16 Teams)</option>
                      <option value="32">۳۲ تیم (32 Teams)</option>
                    </select>
                  </div>

                  {/* Match Format */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary font-vazir">
                      {t('settings.defaultMatchFormat')}
                    </label>
                    <select
                      value={defaultFormat}
                      onChange={(e) => setDefaultFormat(e.target.value)}
                      className="h-10 px-3 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent font-semibold"
                    >
                      <option value="BO1">Best of 1 (BO1)</option>
                      <option value="BO3">Best of 3 (BO3)</option>
                      <option value="BO5">Best of 5 (BO5)</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary font-vazir">
                      {t('settings.entryFeeCurrency')}
                    </label>
                    <div className="grid grid-cols-2 gap-2 h-10">
                      <button
                        onClick={() => setFeeCurrency('IRR')}
                        className={`h-full border rounded-md font-semibold text-xs font-vazir transition-all ${
                          feeCurrency === 'IRR'
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        تومان (IRR)
                      </button>
                      <button
                        onClick={() => setFeeCurrency('USDT')}
                        className={`h-full border rounded-md font-semibold text-xs transition-all ${
                          feeCurrency === 'USDT'
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface border-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        USDT (Tether)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end">
                  <Button variant="primary" className="font-vazir text-xs">
                    {isRtl ? 'ذخیره قوانین تورنمنت' : 'Save Tournament Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Anti-Cheat Rules */}
          {activeTab === 'anticheat' && (
            <div className="space-y-6">
              {/* Sliders Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold font-vazir flex items-center gap-2 text-text-primary">
                    <Sliders className="w-5 h-5 text-accent" />
                    {isRtl ? 'حد آستانه پویای اعتماد به تشخیص' : 'Confidence Action Thresholds'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Slider 1: Auto Flag */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-text-secondary font-vazir">
                      <span>{t('settings.autoFlagSlider')}</span>
                      <span className="font-mono font-bold text-text-primary">
                        {isRtl
                          ? `${Math.round(autoFlag * 100).toLocaleString('fa-IR')}٪`
                          : `${Math.round(autoFlag * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="0.9"
                      step="0.01"
                      value={autoFlag}
                      onChange={(e) => setAutoFlag(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>

                  {/* Slider 2: Auto Kick */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-text-secondary font-vazir">
                      <span>{t('settings.autoKickSlider')}</span>
                      <span className="font-mono font-bold text-text-primary">
                        {isRtl
                          ? `${Math.round(autoKick * 100).toLocaleString('fa-IR')}٪`
                          : `${Math.round(autoKick * 100)}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="0.98"
                      step="0.01"
                      value={autoKick}
                      onChange={(e) => setAutoKick(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                  </div>

                  {/* Toggle: Auto Kick Enabled */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-text-primary font-vazir">
                        {t('settings.autoKickEnabled')}
                      </span>
                      <span className="text-xs text-text-secondary font-vazir">
                        {isRtl ? 'اخراج خودکار بازیکن بلافاصله پس از گذشتن از حد آستانه' : 'Instantly disconnect the user from ElectroLAN session when confidence threshold is met'}
                      </span>
                    </div>

                    <button
                      onClick={() => setAutoKickEnabled(!autoKickEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent ${
                        autoKickEnabled ? 'bg-success' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          autoKickEnabled ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Toggles Checkbox Grid */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold font-vazir flex items-center gap-2 text-text-primary">
                    <Shield className="w-5 h-5 text-accent" />
                    {t('settings.enabledDetectionTypes')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DETECTION_TYPES.map((dt) => {
                      const isEnabled = enabledDetections[dt];

                      return (
                        <div
                          key={dt}
                          onClick={() => handleToggleDetection(dt)}
                          className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                            isEnabled
                              ? 'bg-accent/5 border-accent/40 text-text-primary'
                              : 'bg-surface border-border text-text-muted hover:border-text-muted/30'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold">{dt}</span>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isEnabled ? 'bg-accent border-accent text-white' : 'border-border bg-surface-2'
                          }`}>
                            {isEnabled && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-6 border-t border-border flex items-center justify-end mt-6">
                    <Button variant="primary" className="font-vazir text-xs">
                      {isRtl ? 'ذخیره پیکربندی آنتی‌چیت' : 'Save Anti-Cheat config'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: Admin Accounts */}
          {activeTab === 'admins' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
                <CardTitle className="text-base font-bold font-vazir flex items-center gap-2 text-text-primary">
                  <Users className="w-5 h-5 text-accent" />
                  {isRtl ? 'حساب‌های ادمین و نقش‌ها' : 'Admin Accounts & Roles'}
                </CardTitle>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddAdmin}
                  className="font-vazir text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {t('settings.addAdmin')}
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {adminsList.map((adm) => (
                  <div
                    key={adm.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40 text-xs hover:border-accent/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent">
                        {adm.name.substring(0, 1)}
                      </div>
                      <div>
                        <span className="font-bold text-text-primary block font-vazir leading-tight">
                          {adm.name}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono">@{adm.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={adm.role === 'super_admin' ? 'banned' : 'flagged'}>
                        {adm.role === 'super_admin' ? (isRtl ? 'مدیر کل' : 'SUPER ADMIN') : (isRtl ? 'مدیر تورنمنت' : 'TOURNAMENT ADMIN')}
                      </Badge>
                      {adminsList.length > 1 && (
                        <button
                          onClick={() => handleRemoveAdmin(adm.id)}
                          className="p-1.5 rounded-md text-text-secondary hover:text-danger hover:bg-danger/5 transition-all"
                          title="حذف ادمین"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
