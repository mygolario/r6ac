import { Card, CardContent, Badge, Button, Avatar } from '@r6ac/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament, useReports, usePlayers, useBracket } from '../hooks/useApi';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const bracketVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

export const TournamentDetailPage = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bracket' | 'teams' | 'reports' | 'settings'>('bracket');

  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');

  // API Hooks
  const { data: tournamentDetail, isLoading } = useTournament(id || '');
  const { data: reportsData } = useReports({ page: 1, limit: 100 });
  const { data: playersData } = usePlayers({ page: 1, limit: 100 });
  const { data: bracketMatchesData } = useBracket(id || '');

  if (isLoading || !tournamentDetail) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  const tournament = tournamentDetail?.data || tournamentDetail?.tournament || tournamentDetail;

  const playersList = playersData?.players || [];
  const reportsList = reportsData?.reports || [];
  const bracketMatches = bracketMatchesData || [];

  const toggleTeamRoster = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  const tournamentReports = reportsList.filter((r: any) => {
    return reportTypeFilter === 'ALL' || r.detectionType === reportTypeFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full font-vazir"
    >
      <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-vazir" onClick={() => navigate('/tournaments')}>
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        <span className="text-sm font-semibold font-vazir">{isRtl ? 'بازگشت به تورنمنت‌ها' : 'Back to Tournaments'}</span>
      </div>

      <Card className="relative overflow-hidden border-accent/20 bg-surface-2/30 font-vazir">
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-xl pointer-events-none" />
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 font-vazir">
          <div className="flex items-center gap-4 font-vazir">
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl font-vazir">
              <Trophy className="w-8 h-8 text-accent" />
            </div>
            <div className="font-vazir">
              <div className="flex items-center gap-2 font-vazir">
                <Badge variant={tournament.status === 'active' ? 'banned' : 'clean'}>
                  {isRtl ? tournament.status : tournament.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-text-secondary font-mono">{tournament.id}</span>
              </div>
              <h2 className="text-2xl font-bold font-vazir text-text-primary mt-1 font-vazir">
                {isRtl && tournament.nameFA ? tournament.nameFA : tournament.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-text-secondary border-t border-border md:border-t-0 pt-4 md:pt-0 font-vazir">
            <div className="font-vazir">
              <span className="block text-xs font-vazir font-vazir">{isRtl ? 'حداکثر تیم‌ها' : 'Max Teams'}</span>
              <span className="text-base font-bold text-text-primary font-mono mt-0.5 block font-mono">
                {isRtl ? (tournament.maxTeams || 16).toLocaleString('fa-IR') : (tournament.maxTeams || 16)}
              </span>
            </div>
            <div className="border-l border-border h-8 self-center font-vazir" />
            <div className="font-vazir">
              <span className="block text-xs font-vazir font-vazir">{t('tournaments.prizePool')}</span>
              <span className="text-base font-bold text-accent font-vazir mt-0.5 block font-vazir">
                {isRtl ? `${((tournament.prizePool || 50000000) / 10).toLocaleString('fa-IR')} تومان` : `${(tournament.prizePool || 50000000).toLocaleString()} IRR`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center border-b border-border gap-2 overflow-x-auto font-vazir">
        {(['bracket', 'teams', 'reports', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold font-vazir border-b-2 transition-all duration-200 ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab === 'bracket' && t('tournaments.bracketTab')}
            {tab === 'teams' && t('tournaments.teamsTab')}
            {tab === 'reports' && t('tournaments.reportsTab')}
            {tab === 'settings' && t('tournaments.settingsTab')}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full font-vazir"
        >
          {activeTab === 'bracket' && (
            <div className="overflow-x-auto w-full pb-6 scrollbar-thin font-vazir">
              <div className="min-w-[1100px] grid grid-cols-4 gap-6 p-4 font-vazir">
                {/* Round 1 */}
                <div className="space-y-4 font-vazir">
                  <h4 className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-2 font-vazir">
                    {isRtl ? 'یک‌هشتم نهایی (Round of 16)' : 'Round of 16'}
                  </h4>
                  <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 font-vazir">
                    {bracketMatches.filter((m: any) => m.round === 1).length > 0 ? (
                      bracketMatches.filter((m: any) => m.round === 1).map((match: any) => {
                        const teamAName = isRtl ? (match.teamANameFa || match.teamAName) : match.teamAName;
                        const teamBName = isRtl ? (match.teamBNameFa || match.teamBName) : match.teamBName;
                        const isLive = match.status === 'live' || match.status === 'paused';
                        const winnerA = match.status === 'completed' && match.scoreA > match.scoreB;
                        const winnerB = match.status === 'completed' && match.scoreB > match.scoreA;

                        return (
                          <motion.div variants={bracketVariants} key={match.id}>
                            <Card className={`relative transition-all duration-300 ${isLive ? 'border-accent shadow-accent/15 ring-1 ring-accent animate-pulse' : 'hover:border-border'}`}>
                              {isLive && (
                                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                                </span>
                              )}
                              <CardContent className="p-3 text-xs flex flex-col gap-1.5 font-vazir">
                                <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerA ? 'bg-success/5 text-success' : 'text-text-primary'}`}>
                                  <span className="font-semibold font-vazir">{teamAName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                  <span className="font-mono font-bold text-sm font-mono">
                                    {match.scoreA !== null && match.scoreA !== undefined ? (isRtl ? match.scoreA.toLocaleString('fa-IR') : match.scoreA) : '-'}
                                  </span>
                                </div>
                                <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerB ? 'bg-success/5 text-success' : 'text-text-primary'}`}>
                                  <span className="font-semibold font-vazir">{teamBName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                  <span className="font-mono font-bold text-sm font-mono">
                                    {match.scoreB !== null && match.scoreB !== undefined ? (isRtl ? match.scoreB.toLocaleString('fa-IR') : match.scoreB) : '-'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-text-secondary border border-dashed border-border rounded-lg">
                        {isRtl ? 'بازی‌های این مرحله هنوز شروع نشده‌اند.' : 'Matches for this round have not started.'}
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Round 2 */}
                <div className="space-y-8 flex flex-col justify-around font-vazir">
                  <div className="font-vazir">
                    <h4 className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-2 font-vazir mb-6 font-vazir">
                      {isRtl ? 'یک‌چهارم نهایی (Quarterfinals)' : 'Quarterfinals'}
                    </h4>
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-12 font-vazir">
                      {bracketMatches.filter((m: any) => m.round === 2).length > 0 ? (
                        bracketMatches.filter((m: any) => m.round === 2).map((match: any) => {
                          const teamAName = isRtl ? (match.teamANameFa || match.teamAName) : match.teamAName;
                          const teamBName = isRtl ? (match.teamBNameFa || match.teamBName) : match.teamBName;
                          const winnerA = match.status === 'completed' && match.scoreA > match.scoreB;
                          const winnerB = match.status === 'completed' && match.scoreB > match.scoreA;

                          return (
                            <motion.div variants={bracketVariants} key={match.id} className="font-vazir">
                              <Card className="hover:border-border font-vazir">
                                <CardContent className="p-3 text-xs flex flex-col gap-1.5 font-vazir">
                                  <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerA ? 'bg-success/5 text-success' : 'text-text-primary'}`}>
                                    <span className="font-semibold font-vazir">{teamAName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                    <span className="font-mono font-bold text-sm font-mono">
                                      {match.scoreA !== null && match.scoreA !== undefined ? (isRtl ? match.scoreA.toLocaleString('fa-IR') : match.scoreA) : '-'}
                                    </span>
                                  </div>
                                  <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerB ? 'bg-success/5 text-success' : 'text-text-primary'}`}>
                                    <span className="font-semibold font-vazir">{teamBName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                    <span className="font-mono font-bold text-sm font-mono">
                                      {match.scoreB !== null && match.scoreB !== undefined ? (isRtl ? match.scoreB.toLocaleString('fa-IR') : match.scoreB) : '-'}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-text-secondary border border-dashed border-border rounded-lg">
                          {isRtl ? 'بازی‌های این مرحله هنوز شروع نشده‌اند.' : 'Matches for this round have not started.'}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Round 3 */}
                <div className="space-y-8 flex flex-col justify-around font-vazir">
                  <div className="font-vazir">
                    <h4 className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-2 font-vazir mb-6 font-vazir">
                      {isRtl ? 'نیمه‌نهایی (Semifinals)' : 'Semifinals'}
                    </h4>
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-36 font-vazir">
                      {bracketMatches.filter((m: any) => m.round === 3).length > 0 ? (
                        bracketMatches.filter((m: any) => m.round === 3).map((match: any) => {
                          const teamAName = isRtl ? (match.teamANameFa || match.teamAName) : match.teamAName;
                          const teamBName = isRtl ? (match.teamBNameFa || match.teamBName) : match.teamBName;
                          const winnerA = match.status === 'completed' && match.scoreA > match.scoreB;
                          const winnerB = match.status === 'completed' && match.scoreB > match.scoreA;

                          return (
                            <motion.div variants={bracketVariants} key={match.id}>
                              <Card className="hover:border-border font-vazir">
                                <CardContent className="p-3 text-xs flex flex-col gap-1.5 font-vazir">
                                  <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerA ? 'bg-success/5 text-success' : 'text-text-primary'}`}>
                                    <span className="font-semibold font-vazir">{teamAName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                    <span className="font-mono font-bold text-sm font-mono">
                                      {match.scoreA !== null && match.scoreA !== undefined ? (isRtl ? match.scoreA.toLocaleString('fa-IR') : match.scoreA) : '-'}
                                    </span>
                                  </div>
                                  <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerB ? 'bg-success/5 text-success' : 'text-text-primary'}`}>
                                    <span className="font-semibold font-vazir">{teamBName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                    <span className="font-mono font-bold text-sm font-mono">
                                      {match.scoreB !== null && match.scoreB !== undefined ? (isRtl ? match.scoreB.toLocaleString('fa-IR') : match.scoreB) : '-'}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-text-secondary border border-dashed border-border rounded-lg">
                          {isRtl ? 'بازی‌های این مرحله هنوز شروع نشده‌اند.' : 'Matches for this round have not started.'}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Round 4 */}
                <div className="space-y-8 flex flex-col justify-center font-vazir">
                  <div className="font-vazir">
                    <h4 className="text-xs font-bold text-text-secondary uppercase border-b border-border pb-2 font-vazir mb-6 font-vazir">
                      {isRtl ? 'فینال (Final)' : 'Final'}
                    </h4>
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="font-vazir">
                      {bracketMatches.filter((m: any) => m.round === 4).length > 0 ? (
                        bracketMatches.filter((m: any) => m.round === 4).map((match: any) => {
                          const teamAName = isRtl ? (match.teamANameFa || match.teamAName) : match.teamAName;
                          const teamBName = isRtl ? (match.teamBNameFa || match.teamBName) : match.teamBName;
                          const winnerA = match.status === 'completed' && match.scoreA > match.scoreB;
                          const winnerB = match.status === 'completed' && match.scoreB > match.scoreA;

                          return (
                            <motion.div variants={bracketVariants} key={match.id} className="font-vazir">
                              <Card className="border-warning/40 bg-warning/5 shadow-lg shadow-warning/5 ring-1 ring-warning/20 font-vazir">
                                <CardContent className="p-4 text-sm flex flex-col gap-2 font-vazir">
                                  <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerA ? 'text-success' : 'text-text-primary'}`}>
                                    <span className="font-semibold text-text-primary font-vazir">{teamAName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                    <span className="font-mono font-bold text-sm font-mono">
                                      {match.scoreA !== null && match.scoreA !== undefined ? (isRtl ? match.scoreA.toLocaleString('fa-IR') : match.scoreA) : '-'}
                                    </span>
                                  </div>
                                  <div className={`flex items-center justify-between p-1.5 rounded font-vazir ${winnerB ? 'text-success' : 'text-text-primary'}`}>
                                    <span className="font-semibold text-text-primary font-vazir">{teamBName || (isRtl ? 'مشخص نشده' : 'TBD')}</span>
                                    <span className="font-mono font-bold text-sm font-mono">
                                      {match.scoreB !== null && match.scoreB !== undefined ? (isRtl ? match.scoreB.toLocaleString('fa-IR') : match.scoreB) : '-'}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-text-secondary border border-dashed border-border rounded-lg">
                          {isRtl ? 'بازی فینال هنوز برگزار نشده است.' : 'Final match has not started.'}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-4 font-vazir">
              <div className="flex items-center justify-between font-vazir">
                <h3 className="text-lg font-bold font-vazir">{isRtl ? 'تیم‌های ثبت‌نام شده' : 'Registered Teams'}</h3>
                <span className="text-xs text-text-secondary font-mono font-mono">
                  {isRtl 
                    ? `تعداد کل: ${(tournament.registeredTeamsCount || 0).toLocaleString('fa-IR')} تیم` 
                    : `Total: ${tournament.registeredTeamsCount || 0} teams`}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 font-vazir">
                {(tournament.registeredTeamsList || []).length > 0 ? (
                  (tournament.registeredTeamsList).map((team: any) => {
                    const isExpanded = expandedTeamId === team.id;
                    const teamPlayers = playersList.filter((p: any) => p.teamId === team.id);
                    const captain = teamPlayers.find((p: any) => p.role === 'team_captain') || teamPlayers[0];

                    return (
                      <Card key={team.id} className="overflow-hidden hover:border-border transition-colors duration-200 font-vazir">
                        <div
                          onClick={() => toggleTeamRoster(team.id)}
                          className="p-4 flex items-center justify-between cursor-pointer bg-surface-2/20 hover:bg-surface-2/40 transition-colors font-vazir"
                        >
                          <div className="flex items-center gap-3 font-vazir">
                            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-bold text-accent font-vazir">
                              {(team.nameFa || team.name || 'TM').substring(0, 2)}
                            </div>
                            <div className="font-vazir">
                              <h4 className="font-bold text-base text-text-primary font-vazir">
                                {isRtl ? (team.nameFa || team.name) : team.name}
                              </h4>
                              <p className="text-xs text-text-secondary mt-0.5 font-vazir font-vazir">
                                {isRtl ? 'سرپرست تیم' : 'Captain'}: {captain ? (isRtl && captain.usernameFA ? captain.usernameFA : captain.username) : '??'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 font-vazir">
                            <span className="text-xs text-text-secondary font-mono font-mono">
                              {isRtl
                                ? `${teamPlayers.length.toLocaleString('fa-IR')} بازیکن`
                                : `${teamPlayers.length} players`}
                            </span>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-border bg-surface font-vazir"
                            >
                              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-vazir">
                                {teamPlayers.map((player: any) => (
                                  <div
                                    key={player.id}
                                    className="p-3 rounded-lg border border-border bg-surface-2/40 flex items-center gap-2.5 hover:border-accent/30 transition-colors font-vazir"
                                  >
                                    <Avatar
                                      initials={(isRtl && player.usernameFA ? player.usernameFA : player.username).substring(0, 2)}
                                      size="sm"
                                      status={player.banStatus}
                                    />
                                    <div className="overflow-hidden font-vazir">
                                      <span className="font-semibold text-xs text-text-primary block truncate font-vazir font-vazir">
                                        {isRtl && player.usernameFA ? player.usernameFA : player.username}
                                      </span>
                                      <span className="text-[10px] text-text-secondary uppercase block font-mono font-mono">
                                        {player.role === 'team_captain' ? (isRtl ? 'کاپیتان' : 'Captain') : (isRtl ? 'عضو' : 'Player')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {teamPlayers.length === 0 && (
                                  <div className="col-span-5 text-center p-4 text-xs text-text-secondary">
                                    {isRtl ? 'هیچ بازیکنی در این تیم ثبت نشده است.' : 'No players registered in this team.'}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-text-secondary border border-dashed border-border rounded-lg animate-pulse">
                    {isRtl ? 'هیچ تیمی ثبت‌نام نکرده است.' : 'No teams registered.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4 font-vazir">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 font-vazir">
                <h3 className="text-lg font-bold font-vazir">{isRtl ? 'گزارش‌های تخلف آنتی‌چیت' : 'Anti-Cheat Detection Reports'}</h3>

                <div className="flex items-center gap-2 font-vazir">
                  <span className="text-xs text-text-secondary font-vazir font-vazir">{isRtl ? 'فیلتر تقلب' : 'Filter Cheat'}:</span>
                  <select
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value)}
                    className="h-9 px-3 rounded-md border border-border bg-surface-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-vazir font-vazir"
                  >
                    <option value="ALL">{isRtl ? 'همه نوع‌ها' : 'All Types'}</option>
                    <option value="DMA_CARD">DMA CARD</option>
                    <option value="KMBOX">KMBOX</option>
                    <option value="AIMBOT">AIMBOT</option>
                    <option value="WALLHACK">WALLHACK</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden font-vazir">
                <table className="w-full text-right RTL:text-right text-sm font-vazir">
                  <thead>
                    <tr className="bg-surface-2 border-b border-border text-xs font-bold text-text-secondary font-vazir">
                      <th className="p-3">{t('reports.filterType')}</th>
                      <th className="p-3">{t('players.colPlayer')}</th>
                      <th className="p-3 text-center">{t('dashboard.confidence')}</th>
                      <th className="p-3 text-center">{isRtl ? 'اقدام خودکار' : 'Auto Action'}</th>
                      <th className="p-3 text-end">{t('dashboard.timeAgo')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournamentReports.length > 0 ? (
                      tournamentReports.map((report: any) => {
                        const player = playersList.find((p: any) => p.id === report.playerId);

                        return (
                          <tr key={report.id} className="border-b border-border hover:bg-surface-2/20 text-xs font-vazir">
                            <td className="p-3 font-bold text-accent font-mono font-mono">{report.detectionType}</td>
                            <td className="p-3 font-semibold text-text-primary font-vazir font-vazir">
                              {player ? (isRtl && player.usernameFA ? player.usernameFA : player.username) : report.playerId}
                            </td>
                            <td className="p-3 text-center font-bold font-mono font-vazir">
                              <span className={report.confidence > 0.85 ? 'text-danger' : report.confidence > 0.6 ? 'text-warning' : 'text-success'}>
                                {isRtl ? `${Math.round(report.confidence * 100).toLocaleString('fa-IR')}٪` : `${Math.round(report.confidence * 100)}%`}
                              </span>
                            </td>
                            <td className="p-3 text-center font-vazir">
                              <Badge variant={report.autoAction === 'kick' ? 'banned' : 'flagged'}>
                                {report.autoAction}
                              </Badge>
                            </td>
                            <td className="p-3 text-end text-text-secondary font-mono font-mono">
                              {new Date(report.createdAt).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-text-secondary font-vazir font-vazir">
                          {isRtl ? 'هیچ گزارشی ثبت نشده است.' : 'No reports found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <Card className="font-vazir">
              <CardContent className="p-6 space-y-6 font-vazir">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-vazir">
                  <div className="font-vazir">
                    <label className="block text-xs text-text-secondary font-vazir mb-1 font-vazir">
                      {isRtl ? 'نام رسمی تورنمنت (FA)' : 'Official Tournament Name (FA)'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={tournament.nameFA || tournament.name}
                      className="h-10 w-full px-3 rounded-md border border-border bg-surface-2/40 text-sm text-text-primary font-bold font-vazir outline-none cursor-not-allowed font-vazir"
                    />
                  </div>

                  <div className="font-vazir">
                    <label className="block text-xs text-text-secondary font-vazir mb-1 font-vazir">
                      {isRtl ? 'نام انگلیسی (EN)' : 'English Subtitle (EN)'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={tournament.name}
                      className="h-10 w-full px-3 rounded-md border border-border bg-surface-2/40 text-sm text-text-primary font-bold font-mono outline-none cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="font-vazir">
                    <label className="block text-xs text-text-secondary font-vazir mb-1 font-vazir">
                      {isRtl ? 'جایزه نقدی کل' : 'Total Prize Pool'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={isRtl ? `${((tournament.prizePool || 50000000) / 10).toLocaleString('fa-IR')} تومان` : `${(tournament.prizePool || 50000000).toLocaleString()} IRR`}
                      className="h-10 w-full px-3 rounded-md border border-border bg-surface-2/40 text-sm text-text-primary font-bold font-vazir outline-none cursor-not-allowed font-vazir"
                    />
                  </div>

                  <div className="font-vazir">
                    <label className="block text-xs text-text-secondary font-vazir mb-1 font-vazir">
                      {isRtl ? 'تاریخ آغاز بازی‌ها' : 'Start Date'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={new Date(tournament.startDate || new Date()).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}
                      className="h-10 w-full px-3 rounded-md border border-border bg-surface-2/40 text-sm text-text-primary font-bold font-mono outline-none cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end font-vazir">
                  <Button variant="secondary" disabled className="font-vazir text-xs font-vazir">
                    {isRtl ? 'ویرایش محدود شده (فقط خواندنی)' : 'Editing Restricted (Read-only)'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};
