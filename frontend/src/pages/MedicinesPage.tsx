import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Bell, Home, Hospital, Pill, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { createMedicine, fetchMedicines, notifyMedicine, patchMedicine } from '@/services/api';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Med = {
  id: string;
  name: string;
  dose?: string;
  reminderTime?: string;
  time?: string;
  telegram?: boolean;
  active?: boolean;
};

export function MedicinesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['meds'],
    queryFn: async () => (await fetchMedicines()) as Med[],
  });
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [time, setTime] = useState('09:00');

  const add = useMutation({
    mutationFn: async () => createMedicine({ name, reminderTime: time, telegram: true, active: true, dose: '' }),
    onSuccess: async () => {
      setName('');
      await qc.invalidateQueries({ queryKey: ['meds'] });
    },
  });

  const toggle = useMutation({
    mutationFn: async (m: Med) => patchMedicine(m.id, { active: !m.active }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['meds'] }),
  });

  const notify = useMutation({
    mutationFn: (id: string) => notifyMedicine(id),
    onSuccess: (d) => {
      setNotifyMsg(d.ok ? 'Telegram reminder sent.' : d.error || `Status: ${d.status}`);
      setTimeout(() => setNotifyMsg(null), 5000);
    },
    onError: () => setNotifyMsg('Could not reach server. Start backend on port 8787.'),
  });

  const meds = (q.data || []) as Med[];

  return (
    <div className="space-y-6 pb-24">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('meds.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('meds.title')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('meds.sub')}</p>
        <p className="mt-2 text-xs text-white/45">{t('meds.telegramSetup')}</p>
        {notifyMsg ? <p className="mt-2 text-xs font-bold text-aegis-blue">{notifyMsg}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('meds.addTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>{t('meds.name')}</Label>
            <Input id="med-name" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('meds.placeholder')} />
          </div>
          <div>
            <Label>{t('meds.reminderTime')}</Label>
            <Input className="mt-2" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" type="button" disabled={!name || add.isPending} onClick={() => add.mutate()}>
              {t('meds.saveReminder')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {meds.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-display text-lg font-extrabold">{m.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/55">
                  <span className="inline-flex items-center gap-1">
                    <AlarmClock className="h-3.5 w-3.5" />
                    {m.reminderTime || m.time || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Bell className="h-3.5 w-3.5" />
                    {t('meds.telegram')} {m.telegram ? t('meds.telegramOn') : t('meds.telegramOff')}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="sm" variant="outline" disabled={notify.isPending} onClick={() => notify.mutate(m.id)}>
                  {t('meds.testTelegram')}
                </Button>
                <div className="text-xs font-bold text-white/50">{t('meds.active')}</div>
                <Switch checked={Boolean(m.active)} onCheckedChange={() => toggle.mutate(m)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-3 text-[11px] font-extrabold text-white/55">
          <Link to="/" className="grid place-items-center gap-1 text-white/70 hover:text-white">
            <Home className="h-5 w-5" />
            {t('meds.footerDashboard')}
          </Link>
          <Link to="/hospitals" className="grid place-items-center gap-1 hover:text-white">
            <Hospital className="h-5 w-5" />
            {t('nav.hospitals')}
          </Link>
          <div className="relative -mt-10 grid place-items-center">
            <Button className="h-14 w-14 rounded-full shadow-float" aria-label={t('meds.addShortcut')} onClick={() => document.getElementById('med-name')?.focus()}>
              <Pill className="h-6 w-6" />
            </Button>
            <div className="mt-2 text-[10px] font-extrabold tracking-wide text-white/45">{t('meds.footerReminder')}</div>
          </div>
          <Link to="/settings" className="grid place-items-center gap-1 hover:text-white">
            <Settings className="h-5 w-5" />
            {t('nav.settings')}
          </Link>
        </div>
      </div>
    </div>
  );
}
