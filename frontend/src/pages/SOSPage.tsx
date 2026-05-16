import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Siren } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useI18n } from '@/hooks/useI18n';
import { dispatchSos } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { LiveMap } from '@/components/map/LiveMap';

export function SOSPage() {
  const { t } = useI18n();
  const geo = useGeolocation(true);
  const [note, setNote] = useState('');
  const mut = useMutation({
    mutationFn: async () =>
      dispatchSos({
        lat: geo.lat ?? undefined,
        lng: geo.lng ?? undefined,
        accuracy: geo.accuracy ?? undefined,
        risk: 'SOS_PAGE',
        notes: note,
        tracking: true,
      }),
  });

  const deliveryText = useMemo(() => {
    if (mut.isPending) return t('sos.dispatching');
    if (mut.data)
      return t('sos.deliveryLine', {
        tg: mut.data.results.telegram.status,
        em: mut.data.results.email.status,
      });
    if (mut.isError) return t('sos.dispatchFailed');
    return t('sos.noneYet');
  }, [mut.isPending, mut.data, mut.isError, t]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="text-[11px] font-extrabold tracking-[0.28em] text-white/40">{t('sos.kicker')}</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white md:text-5xl">{t('sos.title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">{t('sos.sub')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="rounded-[24px] border border-white/[0.07] bg-[#0a0a0a]/90 p-8 text-center shadow-float backdrop-blur-xl md:p-12"
      >
        <div className="relative mx-auto grid max-w-[280px] place-items-center py-4">
          <motion.span className="pointer-events-none absolute inset-0 rounded-full bg-aegis-red/25 blur-3xl" animate={{ opacity: [0.45, 0.85, 0.45] }} transition={{ repeat: Infinity, duration: 1.8 }} />
          <motion.button
            type="button"
            aria-label={t('sos.dispatch')}
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
            className="relative grid h-52 w-52 place-items-center rounded-full bg-aegis-red text-base font-extrabold text-white shadow-neon"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.94 }}
          >
            <span className="flex flex-col items-center gap-2">
              <Siren className="h-9 w-9" strokeWidth={2.2} />
              {t('sos.button')}
            </span>
          </motion.button>
        </div>
        <p className="mx-auto mt-6 max-w-md text-sm text-white/50">{t('sos.hint')}</p>
        <Link to="/settings" className="mt-4 inline-block text-sm font-bold text-aegis-signin transition hover:brightness-125">
          {t('sos.configure')}
        </Link>
        <label className="mx-auto mt-8 block max-w-lg text-left text-xs text-white/40" htmlFor="sos-note">
          {t('sos.optionalNote')}
        </label>
        <textarea
          id="sos-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mx-auto mt-2 min-h-[88px] w-full max-w-lg rounded-2xl border border-white/[0.08] bg-black/50 p-3 text-sm text-white outline-none transition focus:border-aegis-signin/40"
          placeholder={t('sos.placeholder')}
        />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="h-full overflow-hidden border-white/[0.07] bg-[#0a0a0a]/90">
            <CardContent className="p-0">
              <div className="border-b border-white/[0.06] px-5 py-3 text-[11px] font-extrabold tracking-[0.22em] text-white/40">{t('sos.liveLocation')}</div>
              <div className="p-3">
                {geo.lat && geo.lng ? (
                  <LiveMap lat={geo.lat} lng={geo.lng} accuracyM={geo.accuracy} heightClass="h-[280px] md:h-[320px]" />
                ) : (
                  <div className="grid h-[280px] place-items-center rounded-xl border border-white/[0.06] bg-black/40 text-sm text-white/50">
                    {t('sos.waitingGps')} {geo.error || ''}
                  </div>
                )}
              </div>
              {geo.lat != null && geo.lng != null ? (
                <div className="border-t border-white/[0.06] px-5 py-2 font-mono text-[11px] text-white/45">
                  {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="h-full border-white/[0.07] bg-[#0a0a0a]/90">
            <CardContent className="p-0">
              <div className="border-b border-white/[0.06] px-5 py-3 text-[11px] font-extrabold tracking-[0.22em] text-white/40">{t('sos.delivery')}</div>
              <div className="p-5 text-sm leading-relaxed text-white/55">{deliveryText}</div>
              {mut.data?.results?.telegram?.status === 'failed' && mut.data?.results?.telegram?.error ? (
                <div className="px-5 pb-3 text-xs text-aegis-warning">
                  {t('history.telegram')} {String(mut.data.results.telegram.error)}
                </div>
              ) : null}
              {mut.data?.results?.email?.status === 'failed' && mut.data?.results?.email?.error ? (
                <div className="px-5 pb-3 text-xs text-aegis-warning">
                  {t('history.email')} {String(mut.data.results.email.error)}
                </div>
              ) : null}
              {mut.data?.report?.url ? (
                <div className="border-t border-white/[0.06] px-5 py-3">
                  <div className="text-[11px] font-extrabold tracking-wide text-emerald-400/90">PDF REPORT</div>
                  <a className="mt-2 inline-block text-xs font-bold text-aegis-blue hover:underline" href={mut.data.report.url} target="_blank" rel="noreferrer">
                    {mut.data.report.filename || 'Open PDF'}
                  </a>
                  {mut.data.report.incidentId ? (
                    <div className="mt-1 font-mono text-[10px] text-white/40">ID {mut.data.report.incidentId}</div>
                  ) : null}
                </div>
              ) : null}
              {mut.data &&
              (mut.data.results.telegram.status === 'failed' || mut.data.results.email.status === 'failed') ? (
                <div className="border-t border-white/[0.06] px-5 py-3 text-xs leading-relaxed text-white/45">
                  {t('sos.channelHelp')}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
