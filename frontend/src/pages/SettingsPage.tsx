import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { saveSettings } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/hooks/useI18n';
import { mergeUserSettings } from '@/lib/settingsDefaults';
import type { UserSettings } from '@/types/aegis';
import { translate } from '@/i18n/strings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const LANG_IDS = ['en', 'hi', 'kn', 'ta', 'te', 'mr', 'zh', 'ja'] as const;

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  const { t, lang: uiLang } = useI18n();

  const s = useMemo(() => mergeUserSettings(user?.settings), [user?.settings]);

  const [alertDraft, setAlertDraft] = useState({
    telegramChatId: '',
    telegramGroupId: '',
    alertEmail: '',
    alertPhone: '',
  });

  useEffect(() => {
    if (!user?.settings) return;
    setAlertDraft({
      telegramChatId: user.settings.telegramChatId || '',
      telegramGroupId: user.settings.telegramGroupId || '',
      alertEmail: user.settings.alertEmail || '',
      alertPhone: user.settings.alertPhone || '',
    });
  }, [user?.settings]);

  const quickSave = useMutation({
    mutationFn: (patch: Partial<UserSettings>) => saveSettings(patch),
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries();
    },
  });

  const saveAlerts = useMutation({
    mutationFn: () =>
      saveSettings({
        telegramChatId: alertDraft.telegramChatId,
        telegramGroupId: alertDraft.telegramGroupId,
        alertEmail: alertDraft.alertEmail,
        alertPhone: alertDraft.alertPhone,
      }),
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries();
    },
  });

  if (!user) return null;

  const langLabel = (id: string) => translate(uiLang, `lang.${id}`);

  return (
    <div className="space-y-5 pb-10">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('settings.control')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('settings.title')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('settings.sub')}</p>
      </div>

      {quickSave.isError ? <p className="text-sm font-semibold text-aegis-red">{t('settings.saveError')}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-2 block text-white/50" htmlFor="lang-select">
            {t('settings.language')}
          </Label>
          <div className="relative">
            <select
              id="lang-select"
              className="h-12 w-full appearance-none rounded-2xl border border-white/[0.08] bg-black/40 px-4 pr-10 text-sm font-bold text-white outline-none focus:border-aegis-signin/50"
              value={s.language}
              disabled={quickSave.isPending}
              onChange={(e) => quickSave.mutate({ language: e.target.value })}
            >
              {LANG_IDS.map((id) => (
                <option key={id} value={id}>
                  {langLabel(id)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.experience')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(
            [
              ['darkMode', 'settings.darkMode'],
              ['largeText', 'settings.largeText'],
              ['vibrations', 'settings.vibrations'],
            ] as const
          ).map(([k, labelKey]) => (
            <div key={k} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-3">
              <div className="text-sm font-bold text-white/80">{t(labelKey)}</div>
              <Switch
                checked={Boolean(s[k])}
                disabled={quickSave.isPending}
                onCheckedChange={(v) => quickSave.mutate({ [k]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.alerts')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>{t('settings.telegramChat')}</Label>
            <Input className="mt-2" value={alertDraft.telegramChatId} onChange={(e) => setAlertDraft((d) => ({ ...d, telegramChatId: e.target.value }))} />
          </div>
          <div>
            <Label>{t('settings.telegramGroup')}</Label>
            <Input className="mt-2" value={alertDraft.telegramGroupId} onChange={(e) => setAlertDraft((d) => ({ ...d, telegramGroupId: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>{t('settings.alertEmail')}</Label>
            <Input className="mt-2" type="email" value={alertDraft.alertEmail} onChange={(e) => setAlertDraft((d) => ({ ...d, alertEmail: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>{t('settings.alertPhone')}</Label>
            <Input
              className="mt-2"
              type="tel"
              placeholder="+14155552671"
              value={alertDraft.alertPhone}
              onChange={(e) => setAlertDraft((d) => ({ ...d, alertPhone: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" type="button" disabled={saveAlerts.isPending} onClick={() => saveAlerts.mutate()}>
        {saveAlerts.isPending ? t('settings.saving') : t('settings.save')}
      </Button>
      {saveAlerts.isError ? <p className="text-center text-sm text-aegis-red">{t('settings.saveError')}</p> : null}

      <div className="grid gap-2 text-sm text-white/55">
        <a className="hover:text-white" href="#">
          {t('settings.privacy')}
        </a>
        <a className="hover:text-white" href="#">
          {t('settings.terms')}
        </a>
        <a className="hover:text-white" href="#">
          {t('settings.help')}
        </a>
      </div>

      <div className="pt-6 text-center text-xs text-white/40">{t('settings.footer')}</div>
    </div>
  );
}
