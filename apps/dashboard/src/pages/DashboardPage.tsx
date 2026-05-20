import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Avatar, StatusIndicator } from '@r6ac/ui';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Users, Trophy, AlertTriangle, Shield, Clock, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePlayers, useTournaments, useReports, useLiveMatches } from '../hooks/useApi';

// Custom Count-up Component
const AnimatedCounter = ({ value, isRtl }: { value: number; isRtl: boolean }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    const num = Math.round(latest);
    return isRtl ? num.toLocaleString('fa-IR') : num.toLocaleString('en-US');
  });
  const [displayValue, setDisplayValue] = useState('۰');

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.8, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return <>{displayValue}</>;
};

// Standard Jalali Formatter
const formatJalaliDate = (dateStr: string, isRtl: boolean) => {
  const date = new Date(dateStr);
  if (!isRtl) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Stagger parent container
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

export const DashboardPage = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();

  // Queries
  const { data: playersData } = usePlayers({ page: 1, limit: 100 });
  const { data: tournamentsData } = useTournaments({ page: 1, limit: 10 });
  const { data: reportsData } = useReports({ page: 1, limit: 15 });
  const { data: liveMatchesData } = useLiveMatches();

  const playersList = playersData?.players || [];
  const tournamentsList = tournamentsData?.tournaments || [];
  const reportsList = reportsData?.reports || [];
  const liveMatches = liveMatchesData || [];

  // Stats Data
  const activePlayersCount = playersList.filter((p: any) => p.banStatus !== 'banned').length;
  const activeTournamentsCount = tournamentsList.filter((t: any) => t.status === 'active').length;
  const todayReportsCount = reportsList.filter(
    (r: any) => new Date(r.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const registeredTeamsCount = new Set(playersList.map((p: any) => p.teamId).filter(Boolean)).size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-vazir">{t('navigation.dashboard')}</h1>
        <div className="text-sm text-text-secondary font-vazir">
          {formatJalaliDate(new Date().toISOString(), isRtl)}
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Active Players */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden hover:border-accent/40 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary font-vazir">
                {t('stats.activePlayers')}
              </CardTitle>
              <Users className="w-5 h-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary tracking-tight font-mono">
                <AnimatedCounter value={activePlayersCount} isRtl={isRtl} />
              </div>
              <p className="text-xs text-success flex items-center gap-1 mt-1 font-vazir">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{isRtl ? '۱۲٪+ نسبت به دیروز' : '+12% vs yesterday'}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Active Tournaments */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden hover:border-accent/40 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary font-vazir">
                {t('stats.activeTournaments')}
              </CardTitle>
              <Trophy className="w-5 h-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary tracking-tight font-mono">
                <AnimatedCounter value={activeTournamentsCount} isRtl={isRtl} />
              </div>
              <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 font-vazir">
                <span>{isRtl ? '۲ در حال ثبت‌نام' : '2 in registration'}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Today's Reports */}
        <motion.div variants={itemVariants}>
          <Card
            className={`relative overflow-hidden hover:border-accent/40 transition-colors duration-300 ${
              todayReportsCount > 10 ? 'border-danger/30 bg-danger/5' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary font-vazir">
                {t('stats.todayReports')}
              </CardTitle>
              <AlertTriangle className={`w-5 h-5 ${todayReportsCount > 10 ? 'text-danger' : 'text-warning'}`} />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold tracking-tight font-mono ${
                  todayReportsCount > 10 ? 'text-danger' : 'text-text-primary'
                }`}
              >
                <AnimatedCounter value={todayReportsCount} isRtl={isRtl} />
              </div>
              <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 font-vazir">
                <span>{isRtl ? '۴ گزارش تأیید شده' : '4 confirmed bans'}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Registered Teams */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden hover:border-accent/40 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-text-secondary font-vazir">
                {t('stats.registeredTeams')}
              </CardTitle>
              <Shield className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-text-primary tracking-tight font-mono">
                <AnimatedCounter value={registeredTeamsCount} isRtl={isRtl} />
              </div>
              <p className="text-xs text-text-secondary flex items-center gap-1 mt-1 font-vazir">
                <span>{isRtl ? '۸ تیم در لیگ برتر' : '8 teams in Premier league'}</span>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Middle Row: Live Matches (60%) & Recent Detection Alerts (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live Match Monitor */}
        <Card className="lg:col-span-3 flex flex-col h-[480px]">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2 font-vazir">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
                </span>
                {t('dashboard.liveMatches')}
              </CardTitle>
              <Badge variant="neutral" className="px-2 py-0.5 font-vazir">
                {isRtl ? 'زنده' : 'LIVE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 font-vazir">
            {liveMatches.length > 0 ? (
              liveMatches.slice(0, 4).map((match: any) => {
                const teamAName = isRtl ? (match.teamANameFa || match.teamAName) : match.teamAName;
                const teamBName = isRtl ? (match.teamBNameFa || match.teamBName) : match.teamBName;
                const teamAInitials = (teamAName || 'T1').substring(0, 2);
                const teamBInitials = (teamBName || 'T2').substring(0, 2);

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-2/40 hover:bg-surface-2 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 RTL:-space-x-reverse">
                        <Avatar initials={teamAInitials} size="sm" className="ring-2 ring-border font-mono" />
                        <Avatar initials={teamBInitials} size="sm" className="ring-2 ring-border font-mono" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1.5 font-vazir">
                          <span>{teamAName}</span>
                          <span className="text-xs text-text-secondary font-mono">VS</span>
                          <span>{teamBName}</span>
                        </div>
                        <div className="text-xs text-text-secondary flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-text-secondary" />
                          <span>{isRtl ? 'در حال برگزاری' : 'In Progress'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusIndicator
                        status={
                          match.status === 'live'
                            ? 'online'
                            : match.status === 'paused'
                            ? 'inMatch'
                            : 'offline'
                        }
                        label={
                          match.status === 'live'
                            ? t('dashboard.live')
                            : match.status === 'paused'
                            ? t('dashboard.paused')
                            : t('dashboard.ended')
                        }
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary py-12">
                <Clock className="w-12 h-12 text-text-muted mb-3 animate-pulse" />
                <p className="text-sm font-semibold">{isRtl ? 'هیچ بازی زنده‌ای در حال برگزاری نیست.' : 'No live matches in progress.'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Detection Alerts Feed */}
        <Card className="lg:col-span-2 flex flex-col h-[480px]">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2 font-vazir">
              <AlertTriangle className="w-5 h-5 text-warning" />
              {t('dashboard.recentAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 font-vazir">
            {reportsList.slice(0, 10).map((alert: any, idx: number) => {
              const player = playersList.find((p: any) => p.id === alert.playerId);
              const initials = player ? (isRtl && player.usernameFA ? player.usernameFA : player.username).substring(0, 2) : '??';

              // Determine confidence progress bar color
              let barColor = 'bg-success';
              if (alert.confidence >= 0.5 && alert.confidence <= 0.8) barColor = 'bg-warning';
              if (alert.confidence > 0.8) barColor = 'bg-danger';

              const minutesAgo = idx + 2;

              return (
                <div
                  key={alert.id}
                  className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-2/40 hover:bg-surface-2 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={initials}
                        size="sm"
                        status={player?.banStatus}
                      />
                      <div>
                        <span className="text-sm font-semibold block leading-none font-vazir">
                          {player ? (isRtl && player.usernameFA ? player.usernameFA : player.username) : alert.playerId}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono mt-0.5 block">
                          {isRtl ? `نوع: ${alert.detectionType}` : `Type: ${alert.detectionType}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-text-secondary block font-vazir">
                        {isRtl
                          ? `${minutesAgo.toLocaleString('fa-IR')} دقیقه پیش`
                          : `${minutesAgo}m ago`}
                      </span>
                      <Badge
                        variant={alert.autoAction === 'kick' ? 'banned' : 'flagged'}
                        className="text-[10px] py-0 px-1.5 mt-0.5 font-vazir"
                      >
                        {alert.autoAction === 'kick' ? (isRtl ? 'اخراج شده' : 'Kicked') : (isRtl ? 'مشکوک' : 'Flagged')}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-secondary min-w-[70px] font-vazir">
                      {t('dashboard.confidence')}:
                    </span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor}`}
                        style={{ width: `${alert.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-text-primary">
                      {isRtl
                        ? `${Math.round(alert.confidence * 100).toLocaleString('fa-IR')}٪`
                        : `${Math.round(alert.confidence * 100)}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Tournaments Overview */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2 font-vazir">
            <Trophy className="w-5 h-5 text-warning" />
            {t('dashboard.tournamentsOverview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 font-vazir">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {tournamentsList.map((tournament: any) => {
              const regPercentage = Math.round(
                ((tournament.registeredTeams || 16) / (tournament.maxTeams || 16)) * 100
              );

              let statusVariant: 'clean' | 'flagged' | 'banned' | 'neutral' = 'neutral';
              if (tournament.status === 'active') statusVariant = 'banned';
              if (tournament.status === 'registration') statusVariant = 'clean';
              if (tournament.status === 'upcoming') statusVariant = 'flagged';

              return (
                <div
                  key={tournament.id}
                  className="min-w-[280px] max-w-[320px] flex-shrink-0 p-4 rounded-xl border border-border bg-surface-2/30 hover:border-accent/30 transition-all duration-300 flex flex-col justify-between h-[180px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 font-vazir">
                      <Badge variant={statusVariant}>
                        {isRtl ? tournament.status : tournament.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-text-secondary font-vazir">
                        {tournament.currency === 'IRR' ? 'تومان' : 'USDT'}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm line-clamp-1 mb-1 font-vazir">
                      {isRtl && tournament.nameFA ? tournament.nameFA : tournament.name}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-text-secondary mt-3 font-vazir">
                      <span>{t('dashboard.startDate')}:</span>
                      <span>{formatJalaliDate(tournament.startDate, isRtl)}</span>
                    </div>
                  </div>

                  <div className="mt-4 font-vazir">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                      <span>
                        {isRtl
                          ? `تیم‌ها: ${(tournament.registeredTeams || 16).toLocaleString(
                              'fa-IR'
                            )} / ${(tournament.maxTeams || 16).toLocaleString('fa-IR')}`
                          : `Teams: ${tournament.registeredTeams || 16} / ${tournament.maxTeams || 16}`}
                      </span>
                      <span>{isRtl ? `${regPercentage.toLocaleString('fa-IR')}٪` : `${regPercentage}%`}</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${regPercentage}%` }}
                      />
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => navigate(`/tournaments/${tournament.id}`)} className="w-full text-xs font-vazir">
                      {t('dashboard.view')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
