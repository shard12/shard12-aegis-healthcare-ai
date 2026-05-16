import { motion } from 'framer-motion';
import { Activity, MapPin, QrCode, ScanLine, Stethoscope } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useI18n } from '@/hooks/useI18n';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiveMap } from '@/components/map/LiveMap';

const QUICK = [
  'home.quick.chest',
  'home.quick.stroke',
  'home.quick.burns',
  'home.quick.bleed',
  'home.quick.seizure',
  'home.quick.fever',
  'home.quick.breath',
] as const;

const PROTOCOL_ROWS = [
  { titleKey: 'protocol.chest.title', bodyKey: 'protocol.chest.body', topic: 'cpr' },
  { titleKey: 'protocol.stroke.title', bodyKey: 'protocol.stroke.body', topic: 'stroke' },
  { titleKey: 'protocol.burns.title', bodyKey: 'protocol.burns.body', topic: 'burns' },
  { titleKey: 'protocol.bleed.title', bodyKey: 'protocol.bleed.body', topic: 'bleed' },
  { titleKey: 'protocol.seizure.title', bodyKey: 'protocol.seizure.body', topic: 'seizure' },
  { titleKey: 'protocol.breathing.title', bodyKey: 'protocol.breathing.body', topic: 'breathing' },
  { titleKey: 'protocol.fever.title', bodyKey: 'protocol.fever.body', topic: 'fever' },
  { titleKey: 'protocol.choking.title', bodyKey: 'protocol.choking.body', topic: 'choking' },
] as const;

export function HomePage() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const geo = useGeolocation(true);
  const profile = user?.profile;
  const qrPayload = JSON.stringify({
    n: user?.name,
    bg: profile?.bloodGroup,
    a: profile?.allergies,
    m: profile?.medications,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-extrabold tracking-[0.25em] text-white/45">{t('home.command')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          {t('home.welcome', { name: user?.name || '—' })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">{t('home.subtitle')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/scanner">
            <motion.div
              whileHover={{ y: -2 }}
              className="inline-flex items-center gap-3 rounded-2xl border border-violet-500/35 bg-violet-500/10 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/10 hover:border-violet-500/55"
            >
              <ScanLine className="h-5 w-5 text-violet-400" />
              <span>{t('home.scanner')}</span>
              <span className="text-xs font-semibold text-white/55">{t('home.scannerSub')}</span>
            </motion.div>
          </Link>
          <Link to="/triage">
            <motion.div
              whileHover={{ y: -2 }}
              className="inline-flex items-center gap-3 rounded-2xl border border-aegis-blue/35 bg-aegis-blue/10 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-aegis-blue/10 hover:border-aegis-blue/55"
            >
              <Stethoscope className="h-5 w-5 text-aegis-blue" />
              <span>{t('home.triage')}</span>
              <span className="text-xs font-semibold text-white/55">{t('home.triageSub')}</span>
            </motion.div>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('home.medicalIdentity')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div>
                  <div className="text-xs text-white/50">{t('home.bloodGroup')}</div>
                  <div className="mt-1 text-2xl font-extrabold">{profile?.bloodGroup || '—'}</div>
                </div>
                <Activity className="h-6 w-6 text-aegis-blue" />
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div className="text-xs text-white/50">{t('home.allergies')}</div>
                <div className="mt-2 text-sm font-semibold text-white/80">{(profile?.allergies || []).join(', ') || t('home.noneListed')}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div className="text-xs text-white/50">{t('home.conditions')}</div>
                <div className="mt-2 text-sm font-semibold text-white/80">{(profile?.conditions || []).join(', ') || t('home.noneListed')}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div className="text-xs text-white/50">{t('home.notes')}</div>
                <div className="mt-2 text-sm text-white/70">{profile?.notes || '—'}</div>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white/50">{t('home.qr')}</div>
                  <QrCode className="h-4 w-4 text-white/40" />
                </div>
                <div className="mt-3 grid place-items-center rounded-xl bg-white p-3">
                  <QRCodeSVG value={qrPayload} size={140} bgColor="#ffffff" fgColor="#000000" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-white/50">
                  <MapPin className="h-4 w-4 text-aegis-red" />
                  {t('home.liveLocation')}
                </div>
                <div className="mt-2 text-xs text-white/60">{geo.error ? geo.error : geo.mapsUrl ? geo.mapsUrl : t('home.acquiringGps')}</div>
                {geo.lat && geo.lng ? <div className="mt-3"><LiveMap lat={geo.lat} lng={geo.lng} accuracyM={geo.accuracy} heightClass="h-[220px]" /></div> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('home.quickEmergencies')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK.map((labelKey) => (
              <Link key={labelKey} to="/risk" state={{ message: `${t('home.quick.statePrefix')}${t(labelKey)}` }}>
                <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-3 text-sm font-extrabold text-white/85 hover:border-aegis-red/35">
                  {t(labelKey)}
                </motion.div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('home.nearbyTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-white/60">
          {t('home.nearbyBefore')}{' '}
          <Link className="text-aegis-blue hover:underline" to="/hospitals">
            {t('home.nearbyLink')}
          </Link>{' '}
          {t('home.nearbyAfter')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('home.protocolsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-white/70">
          <p>{t('home.protocolsIntro')}</p>
          <ul className="space-y-3">
            {PROTOCOL_ROWS.map((row) => (
              <li key={row.titleKey} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="font-extrabold text-white/90">{t(row.titleKey)}</div>
                <p className="mt-2 leading-relaxed text-white/65">{t(row.bodyKey)}</p>
                <Link className="mt-2 inline-block text-xs font-bold text-aegis-blue hover:underline" to={`/first-aid?topic=${row.topic}`}>
                  {t('home.openTopic')}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-white/55">
            {t('home.protocolsCtaOpen')}{' '}
            <Link className="text-aegis-blue hover:underline" to="/first-aid?topic=cpr">
              {t('home.protocolsFirstAid')}
            </Link>{' '}
            {t('home.protocolsCtaSuffix')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
