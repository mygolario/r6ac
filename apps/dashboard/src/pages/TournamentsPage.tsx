import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@r6ac/ui';
import { motion } from 'framer-motion';
import { Trophy, Plus, Calendar, Users, ArrowRight } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTournaments } from '../hooks/useApi';

// Jalali Formatter
const formatJalaliDateRange = (dateStr: string, isRtl: boolean) => {
  const date = new Date(dateStr);
  const dateEnd = new Date(date.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days event
  if (!isRtl) {
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return `${date.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' })} تا ${dateEnd.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', year: 'numeric' })}`;
};

// Prize Pool Formatter
const formatPrizePool = (prize: number, currency: string, isRtl: boolean) => {
  if (isRtl) {
    const formatted = Math.floor(prize / 10).toLocaleString('fa-IR');
    return `${formatted} تومان`;
  }
  return `${prize.toLocaleString('en-US')} IRR`;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } },
};

export const TournamentsPage = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();

  const { data: tournamentsData } = useTournaments({ page: 1, limit: 10 });
  const tournamentsList = tournamentsData?.tournaments || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full font-vazir"
    >
      <div className="flex items-center justify-between font-vazir">
        <div>
          <h1 className="text-3xl font-bold font-vazir">{t('tournaments.title')}</h1>
          <p className="text-sm text-text-secondary mt-1 font-vazir">
            {isRtl ? 'مشاهده و مدیریت تورنمنت‌های آنتی‌چیت' : 'View and manage anti-cheat tournaments'}
          </p>
        </div>

        <Button variant="primary" className="font-vazir flex items-center gap-1.5 font-vazir" onClick={() => navigate('/tournaments/new')}>
          <Plus className="w-4 h-4" />
          {t('tournaments.createButton')}
        </Button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-vazir"
      >
        {tournamentsList.map((tour: any) => {
          const regTeams = tour.registeredTeams || 16;
          const maxT = tour.maxTeams || 16;
          const percentage = Math.round((regTeams / maxT) * 100);

          let badgeVariant: 'clean' | 'flagged' | 'banned' | 'neutral' = 'neutral';
          if (tour.status === 'active') badgeVariant = 'banned';
          if (tour.status === 'registration') badgeVariant = 'clean';
          if (tour.status === 'upcoming') badgeVariant = 'flagged';

          return (
            <motion.div key={tour.id} variants={cardVariants} className="font-vazir">
              <Card className="hover:border-accent/40 transition-all duration-300 flex flex-col justify-between h-[340px] relative overflow-hidden group font-vazir">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/0 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="font-vazir">
                  <CardHeader className="pb-3 font-vazir">
                    <div className="flex items-center justify-between mb-1 font-vazir">
                      <Badge variant={badgeVariant}>
                        {isRtl ? tour.status : tour.status.toUpperCase()}
                      </Badge>
                      <Trophy className="w-5 h-5 text-warning/80 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <CardTitle className="text-lg font-bold text-text-primary font-vazir leading-tight line-clamp-1">
                      {isRtl && tour.nameFA ? tour.nameFA : tour.name}
                    </CardTitle>
                    <p className="text-xs text-text-secondary mt-1 font-mono">
                      {tour.name}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3 font-vazir">
                    <div className="flex items-center justify-between text-sm font-vazir">
                      <span className="text-text-secondary font-vazir">{t('tournaments.prizePool')}:</span>
                      <span className="font-bold text-accent font-vazir">
                        {formatPrizePool(tour.prizePool || 50000000, tour.currency || 'IRR', isRtl)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm font-vazir">
                      <span className="text-text-secondary font-vazir flex items-center gap-1 font-vazir">
                        <Calendar className="w-4 h-4 text-text-secondary" />
                        {isRtl ? 'زمان برگزاری' : 'Event Dates'}:
                      </span>
                      <span className="text-xs text-text-primary font-vazir font-semibold font-vazir">
                        {formatJalaliDateRange(tour.startDate || new Date().toISOString(), isRtl)}
                      </span>
                    </div>

                    <div className="pt-2 font-vazir">
                      <div className="flex items-center justify-between text-xs text-text-secondary mb-1 font-vazir">
                        <span className="font-vazir flex items-center gap-1 font-vazir">
                          <Users className="w-3.5 h-3.5" />
                          {t('tournaments.teamsCount')}:
                        </span>
                        <span className="font-bold font-vazir font-mono">
                          {isRtl
                            ? `${regTeams.toLocaleString('fa-IR')} / ${maxT.toLocaleString('fa-IR')}`
                            : `${regTeams} / ${maxT}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-6 pt-0 border-t border-border mt-auto font-vazir">
                  <Button
                    variant="secondary"
                    className="w-full text-sm font-vazir flex items-center justify-center gap-1.5 group-hover:border-accent group-hover:text-accent transition-colors duration-200"
                    onClick={() => navigate(`/tournaments/${tour.id}`)}
                  >
                    {t('tournaments.manageButton')}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
