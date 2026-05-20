import { Player } from '@r6ac/types';
import { Card, CardContent, Badge, Button, Avatar } from '@r6ac/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, AlertTriangle, ShieldAlert, Ban, Info, Eye, ShieldCheck, History } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayers, useUpdateBanStatus, usePlayer, useReports } from '../hooks/useApi';

// Custom Drawer Component
const Drawer = ({
  isOpen,
  onClose,
  children,
  isRtl,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isRtl: boolean;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer content */}
          <div className={`fixed inset-y-0 ${isRtl ? 'right-0 pl-10' : 'left-0 pr-10'} max-w-full flex`}>
            <motion.div
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-xl bg-surface border-l border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between font-vazir">
                <h3 className="text-lg font-bold text-text-primary">
                  {isRtl ? 'جزئیات کامل بازیکن' : 'Player Details'}
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-md text-text-secondary hover:text-text-primary focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin font-vazir">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Custom Safety Gate Ban Confirmation Modal
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  username,
  isRtl,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  username: string;
  isRtl: boolean;
}) => {
  const [typedName, setTypedName] = useState('');
  const isValid = typedName === username;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md p-6 rounded-xl border border-border bg-surface shadow-2xl flex flex-col gap-4 font-vazir"
          >
            <div className="flex items-center gap-3 text-danger border-b border-border pb-3">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h3 className="text-lg font-bold font-vazir">
                {isRtl ? 'تایید مسدودیت دائم پلتفرم' : 'Confirm Permanent Ban'}
              </h3>
            </div>

            <p className="text-sm text-text-secondary font-vazir leading-relaxed">
              {isRtl
                ? `آیا از مسدود کردن دائم بازیکن ${username} مطمئن هستید؟ این اقدام شناسه سخت‌افزاری و اکانت وی را مسدود کرده و قابل بازگشت نیست.`
                : `Are you sure you want to permanently ban player ${username}? This action blocks their HWID and account and is irreversible.`}
            </p>

            <div className="flex flex-col gap-2 mt-2 font-vazir">
              <label className="text-xs text-text-secondary font-vazir">
                {isRtl
                  ? `جهت تایید، لطفاً نام کاربری بازیکن را دقیقا تایپ کنید: ${username}`
                  : `To confirm, please type the player's username exactly: ${username}`}
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={username}
                className="h-10 px-3 rounded-md border border-border bg-surface-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-danger text-center font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 border-t border-border pt-4">
              <Button variant="secondary" onClick={onClose} className="font-vazir">
                {isRtl ? 'انصراف' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                disabled={!isValid}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="font-vazir"
              >
                {isRtl ? 'تایید و اعمال مسدودیت' : 'Confirm & Apply Ban'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Container stagger variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
};

export const PlayersPage = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'clean' | 'flagged' | 'banned'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // API Hooks
  const { data: playersData } = usePlayers({
    page: 1,
    limit: 100,
    search: search || undefined,
    banStatus: filter === 'all' ? undefined : filter,
  });
  const { data: reportsData } = useReports({ page: 1, limit: 1000 });
  const updateBanMutation = useUpdateBanStatus();

  const filteredPlayers = playersData?.players || [];
  const totalCount = playersData?.total || filteredPlayers.length;
  const reportsList = reportsData?.reports || [];

  const { data: playerDetailData } = usePlayer(selectedPlayer?.id || '');
  const playerDetail = playerDetailData || null;
  const playerReports = reportsList.filter((r: any) => r.playerId === selectedPlayer?.id);

  const handleRowClick = (player: Player) => {
    setSelectedPlayer(player);
    setIsDrawerOpen(true);
  };

  const handleApplyAction = async (playerId: string, action: 'clean' | 'flagged' | 'banned') => {
    try {
      let banType: 'warning' | 'permanent_ban' = 'warning';
      if (action === 'banned') banType = 'permanent_ban';

      await updateBanMutation.mutateAsync({
        id: playerId,
        data: {
          banStatus: action,
          banType,
          reason: `Manual override to ${action}`,
        },
      });

      if (selectedPlayer && selectedPlayer.id === playerId) {
        setSelectedPlayer((prev) => (prev ? { ...prev, banStatus: action } : null));
      }
    } catch (err) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-vazir">
        <div>
          <h1 className="text-3xl font-bold font-vazir">{t('players.title')}</h1>
          <p className="text-sm text-text-secondary mt-1 font-vazir">
            {isRtl
              ? `نمایش ${filteredPlayers.length.toLocaleString('fa-IR')} بازیکن از مجموع ${totalCount.toLocaleString('fa-IR')}`
              : `Showing ${filteredPlayers.length} of ${totalCount} players`}
          </p>
        </div>

        <Button variant="primary" className="font-vazir flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          {t('players.addButton')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-vazir">
          <div className="w-full md:max-w-md relative flex items-center">
            <Search className={`absolute ${isRtl ? 'left-3' : 'right-3'} text-text-secondary w-5 h-5`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('players.searchPlaceholder')}
              className={`h-10 w-full rounded-md border border-border bg-surface-2 ${
                isRtl ? 'pl-10 pr-4 text-right' : 'pr-10 pl-4 text-left'
              } text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent font-vazir`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto font-vazir">
            {(['all', 'clean', 'flagged', 'banned'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-4 py-2 rounded-md text-xs font-semibold font-vazir border transition-all duration-200 ${
                  filter === opt
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {t(`players.filter${opt.charAt(0).toUpperCase() + opt.slice(1)}`)}
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
                <th className="p-4 text-center w-12 font-mono">#</th>
                <th className="p-4 text-start">{t('players.colPlayer')}</th>
                <th className="p-4 text-start">{t('players.colTeam')}</th>
                <th className="p-4 text-center">{t('players.colStatus')}</th>
                <th className="p-4 text-center">{t('players.colReports')}</th>
                <th className="p-4 text-start">{t('players.colLastMatch')}</th>
                <th className="p-4 text-center">{t('players.colActions')}</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player: any, idx: number) => {
                  const reportsCount = reportsList.filter((r: any) => r.playerId === player.id).length;
                  const initials = (isRtl && player.usernameFA ? player.usernameFA : player.username).substring(0, 2);

                  return (
                    <motion.tr
                      variants={rowVariants}
                      key={player.id}
                      onClick={() => handleRowClick(player)}
                      className="border-b border-border hover:bg-surface-2/30 transition-colors duration-150 cursor-pointer text-sm"
                    >
                      <td className="p-4 text-center font-mono text-text-secondary font-mono">
                        {isRtl ? (idx + 1).toLocaleString('fa-IR') : idx + 1}
                      </td>
                      <td className="p-4 font-vazir">
                        <div className="flex items-center gap-3 font-vazir">
                          <Avatar
                            initials={initials}
                            size="sm"
                            status={player.banStatus}
                          />
                          <div>
                            <span className="font-semibold block text-text-primary font-vazir">
                              {isRtl && player.usernameFA ? player.usernameFA : player.username}
                            </span>
                            <span className="text-xs text-text-secondary font-mono">{player.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-text-primary text-start font-vazir">
                        {player.teamId ? (isRtl ? 'دارای تیم' : 'In Team') : '-'}
                      </td>
                      <td className="p-4 text-center font-vazir">
                        <Badge variant={player.banStatus}>
                          {t(`players.filter${player.banStatus.charAt(0).toUpperCase() + player.banStatus.slice(1)}`)}
                        </Badge>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-text-primary">
                        {reportsCount > 0 ? (
                          <span className={`px-2 py-0.5 rounded font-mono ${reportsCount > 5 ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                            {isRtl ? reportsCount.toLocaleString('fa-IR') : reportsCount}
                          </span>
                        ) : (
                          <span className="text-text-muted">-</span>
                        )}
                      </td>
                      <td className="p-4 text-text-secondary text-start font-vazir">
                        {player.updatedAt || player.createdAt ? (
                          <span className="text-xs font-mono">
                            {new Date(player.updatedAt || player.createdAt).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-4 text-center font-vazir">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRowClick(player)}
                            className="h-8 px-2.5 text-xs font-vazir"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {player.banStatus !== 'banned' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setSelectedPlayer(player);
                                setIsConfirmOpen(true);
                              }}
                              className="h-8 px-2.5 text-xs font-vazir"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-text-secondary font-vazir">
                    {isRtl ? 'هیچ بازیکنی یافت نشد.' : 'No players found matching your criteria.'}
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </Card>

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} isRtl={isRtl}>
        {selectedPlayer && (
          <div className="space-y-6 font-vazir">
            <div className="flex items-center gap-4 border-b border-border pb-6 font-vazir">
              <Avatar
                initials={(isRtl && selectedPlayer.usernameFA ? selectedPlayer.usernameFA : selectedPlayer.username).substring(0, 2)}
                size="lg"
                status={selectedPlayer.banStatus}
                className="ring-4 ring-border font-mono"
              />
              <div className="flex-1 font-vazir">
                <h4 className="text-xl font-bold text-text-primary leading-tight font-vazir">
                  {isRtl && selectedPlayer.usernameFA ? selectedPlayer.usernameFA : selectedPlayer.username}
                </h4>
                <p className="text-xs text-text-secondary mt-1 font-mono">{selectedPlayer.email}</p>
                <div className="flex items-center gap-2 mt-2 font-vazir">
                  <Badge variant={selectedPlayer.banStatus}>
                    {t(`players.filter${selectedPlayer.banStatus.charAt(0).toUpperCase() + selectedPlayer.banStatus.slice(1)}`)}
                  </Badge>
                  <span className="text-xs text-text-secondary font-vazir">
                    {t('players.joinedDate')}: {new Date(selectedPlayer.createdAt).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                  </span>
                </div>
              </div>
            </div>

            <div className="font-vazir">
              <h5 className="text-xs font-bold text-text-secondary uppercase mb-2 font-vazir tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-accent" />
                {t('players.hwFingerprint')}
              </h5>
              <div className="bg-surface-2 p-3 rounded-lg border border-border flex items-center justify-between font-mono text-sm">
                <span className="text-text-secondary">SHA-256</span>
                <span className="text-text-primary font-bold tracking-widest">
                  {playerDetail?.hardwareFingerprintHash 
                    ? `••••••••${playerDetail.hardwareFingerprintHash.substring(playerDetail.hardwareFingerprintHash.length - 8).toUpperCase()}` 
                    : (isRtl ? 'بدون اثر انگشت سخت‌افزاری' : 'No HW Fingerprint')}
                </span>
              </div>
            </div>

            <div className="font-vazir">
              <h5 className="text-xs font-bold text-text-secondary uppercase mb-3 font-vazir tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-warning" />
                {t('players.timelineTitle')}
              </h5>
              <div className="space-y-4 border-l border-border ps-4 relative ms-2 RTL:border-l-0 RTL:border-r RTL:ps-0 RTL:pe-4 RTL:me-2 font-vazir">
                {playerDetail?.banHistory && playerDetail.banHistory.length > 0 ? (
                  playerDetail.banHistory.map((log: any, idx: number) => (
                    <div key={idx} className="relative font-vazir">
                      <span className="absolute -start-[21px] RTL:-start-auto RTL:-end-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-surface" />
                      <div className="text-xs text-text-secondary font-mono">
                        {new Date(log.createdAt).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}
                      </div>
                      <div className="text-sm font-semibold text-text-primary mt-0.5 font-vazir">
                        {isRtl ? `تغییر وضعیت: ${log.banType} - ${log.reason}` : `Status update: ${log.banType} - ${log.reason}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-secondary">{isRtl ? 'هیچ تاریخچه مسدودیت یا هشداری ثبت نشده است.' : 'No ban history or warnings recorded.'}</p>
                )}
              </div>
            </div>

            <div className="font-vazir">
              <h5 className="text-xs font-bold text-text-secondary uppercase mb-3 font-vazir tracking-wider flex items-center gap-1.5 font-vazir">
                <History className="w-4 h-4 text-accent" />
                {t('players.matchHistory')}
              </h5>
              <div className="space-y-2 font-vazir text-xs text-text-secondary">
                {isRtl 
                  ? 'تاریخچه بازی‌ها در طول مسابقات فعال تورنمنت ثبت و نمایش داده می‌شود.' 
                  : 'Match history is recorded and displayed during active tournament matches.'}
              </div>
            </div>

            <div className="font-vazir">
              <h5 className="text-xs font-bold text-text-secondary uppercase mb-3 font-vazir tracking-wider flex items-center gap-1.5 font-vazir">
                <ShieldAlert className="w-4 h-4 text-danger" />
                {t('players.allReports')}
              </h5>
              <div className="rounded-lg border border-border overflow-hidden bg-surface-2/20 font-vazir">
                <table className="w-full text-right RTL:text-right text-xs font-vazir">
                  <thead>
                    <tr className="bg-surface-2 border-b border-border text-text-secondary font-bold font-vazir">
                      <th className="p-2.5">{t('reports.filterType')}</th>
                      <th className="p-2.5 text-center">{t('dashboard.confidence')}</th>
                      <th className="p-2.5 text-end">{t('dashboard.timeAgo')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerReports && playerReports.length > 0 ? (
                      playerReports.slice(0, 5).map((report: any) => (
                        <tr key={report.id} className="border-b border-border hover:bg-surface-2/30 font-vazir">
                          <td className="p-2.5 font-bold font-mono text-text-primary">{report.detectionType}</td>
                          <td className="p-2.5 text-center font-vazir">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                              report.confidence > 0.8 ? 'text-danger' : report.confidence > 0.5 ? 'text-warning' : 'text-success'
                            }`}>
                              {isRtl
                                ? `${Math.round(report.confidence * 100).toLocaleString('fa-IR')}٪`
                                : `${Math.round(report.confidence * 100)}%`}
                            </span>
                          </td>
                          <td className="p-2.5 text-end text-text-secondary font-mono">
                            {new Date(report.createdAt).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-text-secondary font-vazir">
                          {isRtl ? 'هیچ گزارشی ثبت نشده است.' : 'No reports found for this player.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-border mt-6 font-vazir">
              <div className="grid grid-cols-2 gap-2 font-vazir">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApplyAction(selectedPlayer.id, 'clean')}
                  className="font-vazir text-xs flex items-center justify-center gap-1.5 border-success/30 text-success hover:bg-success/5 active:bg-success/15"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isRtl ? 'رفع تعلیق (پاک)' : 'Unflag (Clean)'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApplyAction(selectedPlayer.id, 'flagged')}
                  className="font-vazir text-xs flex items-center justify-center gap-1.5 border-warning/30 text-warning hover:bg-warning/5 active:bg-warning/15"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {t('players.warn')}
                </Button>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                className="font-vazir text-xs flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                {t('players.permBan')}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {selectedPlayer && (
        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          username={selectedPlayer.username}
          isRtl={isRtl}
          onConfirm={() => handleApplyAction(selectedPlayer.id, 'banned')}
        />
      )}
    </motion.div>
  );
};
