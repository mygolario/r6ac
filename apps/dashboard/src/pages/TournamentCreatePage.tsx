import { Card, CardContent, Button } from '@r6ac/ui';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCreateTournament } from '../hooks/useApi';

export const TournamentCreatePage = () => {
  const { i18n } = useTranslation(['dashboard', 'common']);
  const isRtl = i18n.language === 'fa';
  const navigate = useNavigate();

  const [nameFA, setNameFA] = useState('');
  const [name, setName] = useState('');
  const [prizePool, setPrizePool] = useState(0);
  const [startDate, setStartDate] = useState('');

  const createTournament = useCreateTournament();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTournament.mutateAsync({ nameFA, name, prizePool, startDate: new Date(startDate).toISOString() });
      navigate('/tournaments');
    } catch (error) {
      console.error('Failed to create tournament:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 w-full font-vazir max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer font-vazir" onClick={() => navigate('/tournaments')}>
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        <span className="text-sm font-semibold font-vazir">{isRtl ? 'بازگشت به تورنمنت‌ها' : 'Back to Tournaments'}</span>
      </div>

      <h2 className="text-2xl font-bold font-vazir text-text-primary">
        {isRtl ? 'ایجاد تورنمنت جدید' : 'Create New Tournament'}
      </h2>

      <Card className="font-vazir">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary font-vazir mb-1">
                  {isRtl ? 'نام رسمی تورنمنت (FA)' : 'Official Tournament Name (FA)'}
                </label>
                <input
                  type="text"
                  required
                  value={nameFA}
                  onChange={(e) => setNameFA(e.target.value)}
                  className="h-10 w-full px-3 rounded-md border border-border bg-surface-2 text-sm text-text-primary font-vazir outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary font-vazir mb-1">
                  {isRtl ? 'نام انگلیسی (EN)' : 'English Subtitle (EN)'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full px-3 rounded-md border border-border bg-surface-2 text-sm text-text-primary font-mono outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary font-vazir mb-1">
                  {isRtl ? 'جایزه نقدی کل (IRR)' : 'Total Prize Pool (IRR)'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={prizePool}
                  onChange={(e) => setPrizePool(Number(e.target.value))}
                  className="h-10 w-full px-3 rounded-md border border-border bg-surface-2 text-sm text-text-primary font-vazir outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-text-secondary font-vazir mb-1">
                  {isRtl ? 'تاریخ آغاز بازی‌ها' : 'Start Date'}
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full px-3 rounded-md border border-border bg-surface-2 text-sm text-text-primary font-mono outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end">
              <Button type="submit" isLoading={createTournament.isPending} className="font-vazir text-xs">
                {isRtl ? 'ایجاد تورنمنت' : 'Create Tournament'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
