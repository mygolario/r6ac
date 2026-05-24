import { DetectionReport, DetectionType } from '@r6ac/types';
import { Card, CardContent, Badge, Button, Avatar } from '@r6ac/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Search, Eye, Check, X, SearchCheck, Calendar, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReports, useReviewReport, usePlayers, useLiveMatches } from '../hooks/useApi';

// Stagger parent container
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
};

// All Detection Types list
const DETECTION_TYPES: DetectionType[] = [
  'AIMBOT', 'WALLHACK', 'RADAR_HACK', 'TRIGGER_BOT', 'NO_RECOIL', 'SPEED_HACK',
  'SPOOFER', 'DMA_CARD', 'KMBOX', 'ARDUINO_INPUT', 'DUAL_PC_STREAM', 'MACRO_PATTERN',
  'STATISTICAL_OUTLIER'
];

export const ReportsPage = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(0.0);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'reviewed' | 'actioned'>('pending');

  const [selectedReport, setSelectedReport] = useState<DetectionReport | null>(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [banType, setBanType] = useState<'warning' | 'match' | 'tournament' | 'permanent'>('permanent');
  const [typedName, setTypedName] = useState('');

  // API Hooks
  const { data: reportsData } = useReports({ page: 1, limit: 100, reviewStatus: statusFilter });
  const { data: playersData } = usePlayers({ page: 1, limit: 100 });
  const { data: liveMatchesData } = useLiveMatches();
  const reviewMutation = useReviewReport();

  const reportsList = reportsData?.reports || [];
  const playersList = playersData?.players || [];
  const liveMatches = liveMatchesData || [];

  const filteredReports = reportsList.filter((report: any) => {
    const player = playersList.find((p: any) => p.id === report.playerId);
    const username = player ? (isRtl && player.usernameFA ? player.usernameFA : player.username) : '';

    const matchesSearch =
      (username || '').toLowerCase().includes((search || '').toLowerCase()) ||
      (report.playerId || '').toLowerCase().includes((search || '').toLowerCase());

    const matchesType = typeFilter === 'ALL' || report.detectionType === typeFilter;
    const matchesConfidence = report.confidence >= minConfidence;

    return matchesSearch && matchesType && matchesConfidence;
  });

  const handleConfirmViolation = async () => {
    if (!selectedReport) return;
    try {
      let bType: 'warning' | 'permanent_ban' = 'warning';
      if (banType === 'permanent') bType = 'permanent_ban';

      await reviewMutation.mutateAsync({
        id: selectedReport.id,
        data: {
          reviewStatus: 'actioned',
          action: banType === 'permanent' ? 'ban' : 'flag',
          banType: bType,
          reason: `Human verified violation. Penalty: ${banType}`,
        },
      });
    } catch (err) {} finally {
      setIsConfirmOpen(false);
      setSelectedReport(null);
      setTypedName('');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      await reviewMutation.mutateAsync({
        id: reportId,
        data: {
          reviewStatus: 'dismissed',
          action: 'none',
          reason: 'False positive dismissed by admin.',
        },
      });
    } catch (err) {}
  };

  const handleNeedsMoreReview = async (reportId: string) => {
    try {
      await reviewMutation.mutateAsync({
        id: reportId,
        data: {
          reviewStatus: 'pending',
          action: 'none',
          reason: 'Re-opened for additional investigation.',
        },
      });
    } catch (err) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full font-vazir"
    >
      <div className="font-vazir">
        <h1 className="text-3xl font-bold font-vazir">{t('reports.title')}</h1>
        <p className="text-sm text-text-secondary mt-1 font-vazir">
          {isRtl
            ? 'بازبینی و اقدام روی هشدارهای تقلب و شواهد سخت‌افزاری آنتی‌چیت'
            : 'Review and act upon anti-cheat detection alerts and hardware evidence'}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4 font-vazir">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-vazir">
            <div className="relative flex items-center font-vazir">
              <Search className={`absolute ${isRtl ? 'left-3' : 'right-3'} text-text-secondary w-4.5 h-4.5`} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? 'جستجوی نام بازیکن...' : 'Search player username...'}
                className={`h-10 w-full rounded-md border border-border bg-surface-2 ${
                  isRtl ? 'pl-10 pr-4 text-right' : 'pr-10 pl-4 text-left'
                } text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-vazir`}
              />
            </div>

            <div className="flex flex-col gap-1 font-vazir">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-border bg-surface-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-vazir"
              >
                <option value="ALL">{isRtl ? 'همه تقلب‌ها' : 'All Detection Types'}</option>
                {DETECTION_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 justify-center px-2 font-vazir">
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1 font-vazir">
                <span className="font-vazir">{t('reports.filterConfidence')}:</span>
                <span className="font-mono font-bold text-text-primary font-mono">
                  {isRtl
                    ? `${Math.round(minConfidence * 100).toLocaleString('fa-IR')}٪`
                    : `${Math.round(minConfidence * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div className="relative flex items-center font-vazir">
              <Calendar className={`absolute ${isRtl ? 'left-3' : 'right-3'} text-text-secondary w-4.5 h-4.5`} />
              <input
                type="text"
                readOnly
                value={isRtl ? 'امروز (۲۹ اردیبهشت)' : 'Today (May 19)'}
                className={`h-10 w-full rounded-md border border-border bg-surface-2/40 cursor-not-allowed ${
                  isRtl ? 'pl-10 pr-4 text-right' : 'pr-10 pl-4 text-left'
                } text-xs text-text-secondary outline-none font-vazir`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border font-vazir">
            <span className="text-xs text-text-secondary font-vazir me-2">{t('reports.filterStatus')}:</span>
            {(['pending', 'reviewed', 'actioned'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold font-vazir transition-all duration-200 border ${
                  statusFilter === status
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {status === 'pending' && t('reports.statusPending')}
                {status === 'reviewed' && t('reports.statusReviewed')}
                {status === 'actioned' && t('reports.statusActioned')}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden font-vazir">
        <div className="overflow-x-auto w-full font-vazir">
          <table className="w-full border-collapse text-right RTL:text-right font-vazir">
            <thead>
              <tr className="border-b border-border bg-surface-2/40 text-xs font-bold text-text-secondary uppercase">
                <th className="p-4 text-start">{t('players.colPlayer')}</th>
                <th className="p-4 text-start">{t('reports.colMatch')}</th>
                <th className="p-4 text-start">{t('reports.filterType')}</th>
                <th className="p-4 text-center">{t('dashboard.confidence')}</th>
                <th className="p-4 text-center">{t('reports.colEvidence')}</th>
                <th className="p-4 text-center">{t('dashboard.status')}</th>
                <th className="p-4 text-center">{t('reports.colReviewer')}</th>
                <th className="p-4 text-center">{t('players.colActions')}</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show">
              {filteredReports.length > 0 ? (
                filteredReports.map((report: any) => {
                  const player = playersList.find((p: any) => p.id === report.playerId);
                  const match = liveMatches.find((m: any) => m.id === report.matchId);
                  const initials = player ? (isRtl && player.usernameFA ? player.usernameFA : player.username).substring(0, 2) : '??';

                  let confColor = 'bg-success';
                  if (report.confidence >= 0.5 && report.confidence <= 0.8) confColor = 'bg-warning';
                  if (report.confidence > 0.8) confColor = 'bg-danger';

                  return (
                    <motion.tr
                      variants={rowVariants}
                      key={report.id}
                      className="border-b border-border hover:bg-surface-2/20 transition-colors text-sm font-vazir"
                    >
                      <td className="p-4 font-vazir">
                        {player ? (
                          <div className="flex items-center gap-2 font-vazir">
                            <Avatar initials={initials} size="sm" status={player.banStatus} />
                            <div>
                              <span className="font-semibold block text-text-primary font-vazir">
                                {isRtl && player.usernameFA ? player.usernameFA : player.username}
                              </span>
                              <span className="text-[10px] text-text-secondary font-mono">{player.id}</span>
                            </div>
                          </div>
                        ) : (
                          report.playerId
                        )}
                      </td>
                      <td className="p-4 text-start font-mono text-xs text-text-secondary font-mono">
                        {match ? `${match.teamAName} vs ${match.teamBName}` : (isRtl ? 'شناسه بازی: ' : 'Match ID: ') + report.matchId.substring(0, 8)}
                      </td>
                      <td className="p-4 text-start font-bold font-mono text-accent font-mono">
                        {report.detectionType}
                      </td>
                      <td className="p-4 font-vazir">
                        <div className="flex items-center gap-2 justify-center max-w-[120px] mx-auto font-vazir">
                          <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className={`h-full ${confColor}`} style={{ width: `${report.confidence * 100}%` }} />
                          </div>
                          <span className="font-mono font-bold text-xs text-text-primary font-mono">
                            {isRtl ? `${Math.round(report.confidence * 100).toLocaleString('fa-IR')}٪` : `${Math.round(report.confidence * 100)}%`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center font-vazir">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setIsEvidenceOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs font-vazir text-accent border-accent/20 hover:bg-accent/5 font-vazir"
                        >
                          <Eye className="w-3.5 h-3.5 me-1.5" />
                          {t('reports.viewEvidence')}
                        </Button>
                      </td>
                      <td className="p-4 text-center font-vazir">
                        {report.reviewedBy || report.reviewStatus === 'actioned' ? (
                          <Badge variant="clean">{isRtl ? 'اقدام شده' : 'Actioned'}</Badge>
                        ) : report.requiresHumanReview ? (
                          <Badge variant="flagged">{isRtl ? 'نیازمند بررسی' : 'Needs Review'}</Badge>
                        ) : (
                          <Badge variant="neutral">{isRtl ? 'جدید' : 'New'}</Badge>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono text-xs text-text-secondary font-mono">
                        {report.reviewedBy || '-'}
                      </td>
                      <td className="p-4 font-vazir">
                        <div className="flex items-center justify-center gap-1.5 font-vazir">
                          {!report.reviewedBy && report.reviewStatus !== 'actioned' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsConfirmOpen(true);
                                }}
                                className="h-8 w-8 p-0 rounded-full flex items-center justify-center bg-success hover:bg-success-dark text-white border-0"
                                title={t('reports.confirmViolation')}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleDismissReport(report.id)}
                                className="h-8 w-8 p-0 rounded-full flex items-center justify-center hover:bg-danger/5 hover:border-danger hover:text-danger text-text-secondary"
                                title={t('reports.dismissReport')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                              {!report.requiresHumanReview && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleNeedsMoreReview(report.id)}
                                  className="h-8 w-8 p-0 rounded-full flex items-center justify-center text-text-secondary"
                                  title={t('reports.needsReview')}
                                >
                                  <SearchCheck className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-text-secondary font-vazir">
                    {isRtl ? 'هیچ گزارش مشکوکی یافت نشد.' : 'No alerts found.'}
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {isEvidenceOpen && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEvidenceOpen(false);
                setSelectedReport(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg p-6 rounded-xl border border-border bg-surface shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto font-vazir"
            >
              <div className="flex items-center justify-between border-b border-border pb-3 font-vazir">
                <div className="flex items-center gap-2 text-accent font-vazir">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="text-lg font-bold font-vazir">{t('reports.evidenceTitle')}</h3>
                </div>
                <button
                  onClick={() => {
                    setIsEvidenceOpen(false);
                    setSelectedReport(null);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-vazir">
                <div className="grid grid-cols-2 gap-4 font-vazir">
                  <div className="bg-surface-2 p-3 rounded-lg border border-border font-vazir">
                    <span className="block text-text-secondary mb-0.5 font-vazir">{t('reports.reasonCode')}</span>
                    <span className="font-mono font-bold text-text-primary font-mono">{selectedReport.reasonCode}</span>
                  </div>
                  <div className="bg-surface-2 p-3 rounded-lg border border-border font-vazir">
                    <span className="block text-text-secondary mb-0.5 font-vazir">{t('reports.filterType')}</span>
                    <span className="font-mono font-bold text-accent font-mono">{selectedReport.detectionType}</span>
                  </div>
                </div>

                <div className="bg-surface-2 p-3 rounded-lg border border-border font-vazir">
                  <span className="block text-text-secondary mb-1 font-vazir">{t('reports.timestamp')}</span>
                  <span className="font-mono font-bold text-text-primary font-mono">
                    {new Date(selectedReport.createdAt).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}
                  </span>
                </div>

                <div className="bg-surface-2 p-3 rounded-lg border border-border font-vazir">
                  <span className="block text-text-secondary mb-1 font-vazir">{t('reports.description')}</span>
                  <p className="text-sm font-semibold text-text-primary leading-relaxed font-vazir">
                    {isRtl
                      ? `شناسایی فرکانس ارتباطی و وقفه نامتعارف پورت‌های سخت‌افزاری بر روی آدرس ثبت شده کارت DMA. تغییر ثبات حافظه در محدوده بازی Rainbow Six Siege با سطح اطمینان بسیار بالا.`
                      : `Hardware port polling anomaly and DMA register hook manipulation identified inside Rainbow Six Siege game memory space. Confirms external hardware injector.`}
                  </p>
                </div>

                <div className="bg-surface-2 p-3 rounded-lg border border-border flex items-center justify-between font-vazir">
                  <div className="font-vazir">
                    <span className="block text-text-secondary mb-0.5 font-vazir">{t('reports.recommendedAction')}</span>
                    <span className="font-bold text-danger font-vazir">{isRtl ? 'اخراج و مسدودسازی سخت‌افزاری' : 'Auto Kick & HWID Ban'}</span>
                  </div>
                  <div className="text-right font-vazir">
                    <span className="block text-text-secondary mb-0.5 font-vazir">{t('dashboard.confidence')}</span>
                    <span className="text-base font-bold text-danger font-mono font-mono">
                      {isRtl ? `${Math.round(selectedReport.confidence * 100).toLocaleString('fa-IR')}٪` : `${Math.round(selectedReport.confidence * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 border-t border-border pt-4 font-vazir">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEvidenceOpen(false);
                    setSelectedReport(null);
                  }}
                  className="font-vazir text-xs font-vazir"
                >
                  {isRtl ? 'بستن' : 'Close'}
                </Button>
                {!selectedReport.reviewedBy && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsEvidenceOpen(false);
                      setIsConfirmOpen(true);
                    }}
                    className="font-vazir text-xs font-vazir"
                  >
                    {t('reports.confirmViolation')}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfirmOpen && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsConfirmOpen(false);
                setSelectedReport(null);
                setTypedName('');
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-6 rounded-xl border border-border bg-surface shadow-2xl flex flex-col gap-4 font-vazir"
            >
              <div className="flex items-center gap-3 text-danger border-b border-border pb-3 font-vazir">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h3 className="text-lg font-bold font-vazir">{t('reports.safetyTitle')}</h3>
              </div>

              <div className="flex flex-col gap-2 font-vazir">
                <label className="text-xs text-text-secondary font-vazir">{t('reports.banType')}</label>
                <select
                  value={banType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBanType(e.target.value as 'warning' | 'match' | 'tournament' | 'permanent')}
                  className="h-10 px-3 rounded-md border border-border bg-surface-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-vazir"
                >
                  <option value="warning">{t('reports.banWarning')}</option>
                  <option value="match">{t('reports.banMatch')}</option>
                  <option value="tournament">{t('reports.banTournament')}</option>
                  <option value="permanent">{t('reports.banPermanent')}</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger font-vazir leading-relaxed font-vazir">
                {isRtl
                  ? 'توجه: این اقدام ثبت شده و غیر قابل بازگشت است. اطلاعات بازیکن به عنوان متخلف دائم علامت‌گذاری خواهد شد.'
                  : 'Warning: This action is logged and irreversible. The player will be permanently flagged as a violator.'}
              </div>

              {(() => {
                const player = playersList.find((p: any) => p.id === selectedReport.playerId);
                const actualUsername = player ? player.username : selectedReport.playerId;
                const isValid = typedName === actualUsername;

                return (
                  <div className="flex flex-col gap-2 font-vazir">
                    <label className="text-xs text-text-secondary font-vazir font-vazir">
                      {isRtl
                        ? `برای تایید، نام کاربری بازیکن را دقیقا تایپ کنید (${actualUsername}):`
                        : `To confirm, please type the player's username exactly (${actualUsername}):`}
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder={actualUsername}
                      className="h-10 px-3 rounded-md border border-border bg-surface-2 text-xs text-text-primary text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-danger"
                    />

                    <div className="flex items-center justify-end gap-3 mt-4 border-t border-border pt-4 font-vazir">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setIsConfirmOpen(false);
                          setSelectedReport(null);
                          setTypedName('');
                        }}
                        className="font-vazir text-xs font-vazir"
                      >
                        {isRtl ? 'انصراف' : 'Cancel'}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={!isValid}
                        onClick={handleConfirmViolation}
                        className="font-vazir text-xs font-vazir"
                      >
                        {isRtl ? 'تایید تقلب و اعمال جریمه' : 'Confirm & Apply'}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
