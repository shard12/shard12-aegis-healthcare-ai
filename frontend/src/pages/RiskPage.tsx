import type { ElementType } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  FileText,
  Hospital,
  Phone,
  Send,
  Share2,
  Stethoscope,
  TestTube,
} from 'lucide-react';
import { triage, fetchHospitals, downloadTriagePdf } from '@/services/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useI18n } from '@/hooks/useI18n';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import type { AiProviderStatus, HospitalRow, TriageEnvelope } from '@/types/aegis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiveMap } from '@/components/map/LiveMap';

function RiskGlow({ level, confidence }: { level: string; confidence: number }) {
  const critical = level === 'CRITICAL' || level === 'HIGH';
  return (
    <motion.div
      animate={
        critical
          ? { boxShadow: ['0 0 0px rgba(255,59,48,0)', '0 0 40px rgba(255,59,48,0.45)', '0 0 0px rgba(255,59,48,0)'] }
          : {}
      }
      transition={{ repeat: critical ? Infinity : 0, duration: 1.2 }}
      className={[
        'rounded-3xl border p-6',
        critical ? 'border-aegis-red/50 bg-aegis-red/10' : 'border-white/[0.06] bg-black/30',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-display text-3xl font-extrabold tracking-tight">{level}</div>
        <Badge className="border-aegis-blue/30 text-aegis-blue">{(confidence * 100).toFixed(0)}%</Badge>
        {critical ? (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="ml-auto flex items-center gap-1 text-xs font-extrabold text-aegis-red"
          >
            <AlertTriangle className="h-4 w-4" /> EMERGENCY
          </motion.span>
        ) : null}
      </div>
    </motion.div>
  );
}

function ListCard({ title, items, icon: Icon }: { title: string; items: string[]; icon: ElementType }) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Icon className="h-4 w-4 text-aegis-blue" />
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-white/75">
          {items.map((x, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-aegis-blue">•</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function RiskPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const loc = useLocation() as { state?: { message?: string } };
  const geo = useGeolocation(true);
  const setLast = useUiStore((s) => s.setLastEnvelope);
  const [msg, setMsg] = useState(loc.state?.message || '');
  const [env, setEnv] = useState<TriageEnvelope | null>(null);
  const [ai, setAi] = useState<AiProviderStatus | null>(null);

  useEffect(() => {
    if (loc.state?.message) setMsg(loc.state.message);
  }, [loc.state?.message]);

  const mut = useMutation({
    mutationFn: async () => triage(msg, geo.lat ?? undefined, geo.lng ?? undefined, lang, geo.accuracy ?? undefined, true),
    onSuccess: (d) => {
      setEnv(d.envelope);
      setLast(d.envelope);
      setAi(d.ai);
    },
  });

  const hospitalsQ = useQuery({
    queryKey: ['risk-hospitals', geo.lat, geo.lng],
    queryFn: async () => {
      if (!geo.lat || !geo.lng) return { hospitals: [] as HospitalRow[] };
      const d = await fetchHospitals(geo.lat, geo.lng);
      return { hospitals: (d.hospitals || []) as HospitalRow[] };
    },
    enabled: Boolean(geo.lat && geo.lng) && Boolean(env),
  });

  const e = env;
  const hospitals = hospitalsQ.data?.hospitals?.slice(0, 5) || [];
  const contacts = user?.profile?.emergencyContacts || [];
  const redFlags = (e?.possible_concerns || []).filter((c) =>
    /severe|critical|emergency|red flag|urgent/i.test(String(c))
  );
  const diagnoses = e?.probable_conditions || e?.possible_concerns || [];
  const tests = (e as TriageEnvelope & { suggested_tests?: string[] })?.suggested_tests || [];
  const actions = [...(e?.immediate_actions || []), ...(e?.recommendations || [])].filter(Boolean);
  const timeline = [
    e?.suggested_response,
    e?.recommended_action,
    e?.escalation_advice,
  ].filter(Boolean) as string[];

  const [pdfErr, setPdfErr] = useState<string | null>(null);

  const downloadPdf = async () => {
    if (!e) return;
    setPdfErr(null);
    try {
      const blob = await downloadTriagePdf({
        envelope: e,
        message: msg,
        lat: geo.lat,
        lng: geo.lng,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-triage-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfErr(err instanceof Error ? err.message : 'PDF failed');
    }
  };

  const shareReport = async () => {
    if (!e) return;
    const text = `${e.risk_level}: ${e.medical_summary}\n${e.recommended_action}`;
    if (navigator.share) {
      await navigator.share({ title: 'AEGIS triage', text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('risk.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('risk.title')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('risk.sub')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('risk.input')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input value={msg} onChange={(ev) => setMsg(ev.target.value)} placeholder={t('risk.placeholder')} />
          <Button type="button" className="md:w-44" disabled={!msg || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? '…' : t('risk.analyze')}
          </Button>
        </CardContent>
      </Card>

      {pdfErr ? (
        <Card className="border-aegis-warning/30">
          <CardContent className="p-4 text-sm text-aegis-warning">{pdfErr}</CardContent>
        </Card>
      ) : null}

      {mut.data?.report?.pdfError ? (
        <Card className="border-aegis-warning/30">
          <CardContent className="p-4 text-sm text-aegis-warning">PDF: {mut.data.report.pdfError}</CardContent>
        </Card>
      ) : null}

      {mut.data?.report?.url ? (
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-extrabold text-emerald-400">Report saved</div>
              <p className="mt-1 text-white/70">
                Incident <span className="font-mono text-white">{mut.data.report.incidentId}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold hover:bg-white/10"
                href={mut.data.report.url}
                target="_blank"
                rel="noreferrer"
              >
                <FileText className="h-4 w-4" /> PDF
              </a>
              {mut.data.report.viewUrl ? (
                <a
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/20"
                  href={mut.data.report.viewUrl}
                >
                  QR report
                </a>
              ) : null}
              {mut.data.alerts.telegramStatus === 'sent' ? (
                <Badge className="border-emerald-500/30 text-emerald-400">
                  <Send className="mr-1 h-3 w-3" />
                  {t('risk.telegramSent')}
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mut.isError ? (
        <Card>
          <CardContent className="p-5 text-sm text-aegis-warning">{t('risk.offline')}</CardContent>
        </Card>
      ) : null}

      {ai && ai.status !== 'online' ? (
        <Card className="border-aegis-warning/30 bg-aegis-warning/5">
          <CardContent className="p-4 text-sm text-white/85">
            <div className="font-extrabold text-aegis-warning">{t('risk.aiNoticeTitle')}</div>
            <p className="mt-2 text-white/75">{ai.detail || t('risk.aiNoticeFallback')}</p>
          </CardContent>
        </Card>
      ) : null}

      <AnimatePresence>
        {e ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <motion.div className="text-xs font-extrabold tracking-[0.25em] text-white/40">{t('risk.dashboard')}</motion.div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-1">
                <RiskGlow level={String(e.risk_level)} confidence={e.confidence_score} />
                <div className="text-sm text-white/60">
                  {t('risk.escalation')} {e.emergency_triggered ? t('risk.active') : t('risk.standby')}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void downloadPdf()}>
                    <Download className="mr-1 h-4 w-4" />
                    {t('risk.pdf')}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => void shareReport()}>
                    <Share2 className="mr-1 h-4 w-4" />
                    {t('risk.share')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('risk.why')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/75">{e.why_this_risk}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('risk.summary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-white/75">{e.medical_summary}</CardContent>
                </Card>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ListCard title={t('risk.redFlags')} items={redFlags.length ? redFlags : (e.emergency_triggered ? [e.medical_summary] : [])} icon={AlertTriangle} />
              <ListCard title={t('risk.diagnoses')} items={diagnoses} icon={Stethoscope} />
              <ListCard title={t('risk.tests')} items={tests} icon={TestTube} />
              <ListCard title={t('risk.actions')} items={actions} icon={FileText} />
              <ListCard title={t('risk.concerns')} items={e.possible_concerns || []} icon={AlertTriangle} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('risk.firstAid')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-white/75">{e.suggested_response}</CardContent>
              </Card>
            </div>

            {timeline.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('risk.timeline')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {timeline.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm text-white/75">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-aegis-blue/40 bg-aegis-blue/10 text-xs font-extrabold text-aegis-blue">
                        {i + 1}
                      </div>
                      <p>{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Hospital className="h-4 w-4 text-aegis-red" />
                  <CardTitle className="text-base">{t('risk.hospitals')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {geo.lat && geo.lng ? (
                    <LiveMap lat={geo.lat} lng={geo.lng} hospitals={hospitals} heightClass="h-[220px]" />
                  ) : (
                    <p className="text-sm text-white/55">{t('risk.noHospitals')}</p>
                  )}
                  {hospitals.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2 text-sm">
                      <div>
                        <div className="font-semibold">{h.name}</div>
                        <div className="text-xs text-white/50">
                          {(h.distanceKm * 1000).toFixed(0)} m
                          {h.etaMinutes ? ` · ${t('risk.eta')} ~${h.etaMinutes}m` : ''}
                        </div>
                      </div>
                      <a href={h.directionsUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-aegis-blue hover:underline">
                        {t('sos.directions')}
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <Phone className="h-4 w-4 text-aegis-blue" />
                  <CardTitle className="text-base">{t('risk.contacts')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {contacts.length ? (
                    <ul className="space-y-2 text-sm text-white/75">
                      {contacts.map((c, i) => (
                        <li key={i} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-white/55">{t('risk.noContacts')}</p>
                  )}
                  {e.emergency_triggered ? (
                    <p className="mt-3 text-xs text-aegis-warning">
                      {t('risk.telegram')}: {mut.data?.alerts?.telegramStatus || e.telegram_alert || '—'}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
