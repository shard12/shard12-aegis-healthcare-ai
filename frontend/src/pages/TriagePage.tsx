import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Download, Hospital, Link2, Siren, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { downloadTriagePdf, triage } from '@/services/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useI18n } from '@/hooks/useI18n';
import { useUiStore } from '@/store/uiStore';
import type { AiProviderStatus, TriageEnvelope } from '@/types/aegis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function inferFirstAidTopic(text: string): string | null {
  const t = text.toLowerCase();
  if (/chest|heart|cardiac|crush/.test(t)) return 'cpr';
  if (/stroke|fast|numb|slur|drooping/.test(t)) return 'stroke';
  if (/burn|scald/.test(t)) return 'burns';
  if (/bleed|blood|hemorrh/.test(t)) return 'bleed';
  if (/seizure|convul/.test(t)) return 'seizure';
  if (/breath|wheez|asthma|suffoc|sob/.test(t)) return 'breathing';
  if (/fever|temp|chills/.test(t)) return 'fever';
  if (/chok|swallow|obstruct/.test(t)) return 'choking';
  return null;
}

export function TriagePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const geo = useGeolocation(true);
  const setLast = useUiStore((s) => s.setLastEnvelope);
  const [chief, setChief] = useState('');
  const [env, setEnv] = useState<TriageEnvelope | null>(null);
  const [ai, setAi] = useState<AiProviderStatus | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => triage(chief, geo.lat ?? undefined, geo.lng ?? undefined, lang, geo.accuracy ?? undefined, true),
    onSuccess: (d) => {
      setEnv(d.envelope);
      setLast(d.envelope);
      setAi(d.ai);
      setHistoryId(d.historyId);
      setPdfErr(null);
    },
  });

  const topic = chief ? inferFirstAidTopic(chief) : null;
  const risk = env?.risk_level ? String(env.risk_level).toUpperCase() : '';
  const urgent = risk === 'HIGH' || risk === 'CRITICAL';

  const onPdf = async () => {
    if (!env || !historyId) return;
    setPdfErr(null);
    try {
      const blob = await downloadTriagePdf({
        symptoms: chief,
        envelope: env,
        lat: geo.lat,
        lng: geo.lng,
        historyId,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aegis-clinical-triage-report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfErr(t('triage.pdfError'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('triage.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('triage.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">{t('triage.sub')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-aegis-blue" />
            {t('triage.chiefTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={chief} onChange={(e) => setChief(e.target.value)} placeholder={t('triage.placeholder')} />
          <p className="text-xs text-white/50">{t('triage.chiefHint')}</p>
          <Button type="button" className="w-full md:w-auto" disabled={!chief.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? t('triage.running') : t('triage.run')}
          </Button>
        </CardContent>
      </Card>

      {mut.isError ? (
        <Card>
          <CardContent className="p-5 text-sm text-aegis-warning">{t('triage.requestFailed')}</CardContent>
        </Card>
      ) : null}

      {mut.data?.report?.url ? (
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="p-4 text-sm">
            <div className="font-extrabold text-cyan-300">Auto-dispatch complete</div>
            <p className="mt-2 text-white/70">
              Incident <span className="font-mono text-white">{mut.data.report.incidentId}</span> — PDF saved and pushed to Telegram / Email when configured.
            </p>
            <a className="mt-3 inline-block text-xs font-bold text-aegis-blue hover:underline" href={mut.data.report.url} target="_blank" rel="noreferrer">
              Open server PDF
            </a>
          </CardContent>
        </Card>
      ) : null}

      {ai && ai.status !== 'online' ? (
        <Card className="border-aegis-warning/30 bg-aegis-warning/5">
          <CardContent className="p-4 text-sm text-white/85">
            <div className="font-extrabold text-aegis-warning">{t('triage.aiNoticeTitle')}</div>
            <p className="mt-2 text-white/75">{ai.detail || t('triage.aiNoticeFallback')}</p>
          </CardContent>
        </Card>
      ) : null}

      {ai?.status === 'online' && env && env.intent !== 'offline_guidance' ? (
        <div className="text-xs font-bold tracking-wide text-emerald-400/90">{t('triage.aiOnline')}</div>
      ) : null}

      {env ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                'rounded-3xl border p-6 lg:col-span-1',
                urgent ? 'border-aegis-red/45 bg-aegis-red/10' : 'border-white/[0.06] bg-black/30',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-display text-2xl font-extrabold tracking-tight">{String(env.risk_level)}</div>
                <Badge className="border-aegis-blue/30 text-aegis-blue">{(env.confidence_score * 100).toFixed(0)}%</Badge>
              </div>
              <div className="mt-3 text-xs text-white/55">{t('triage.intentLabel')}</div>
              <div className="text-sm font-semibold text-white/85">{env.intent}</div>
              {env.emergency_category ? (
                <div className="mt-2 text-xs text-white/50">
                  Category: <span className="text-white/80">{env.emergency_category}</span>
                </div>
              ) : null}
            </motion.div>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('triage.differentialTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-white/75">
                  {(env.possible_concerns || []).length ? (
                    env.possible_concerns.map((c) => <li key={c}>{c}</li>)
                  ) : (
                    <li>{t('triage.noneListed')}</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('triage.summary')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/75">{env.medical_summary}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('triage.nextSteps')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button type="button" variant="outline" className="justify-start gap-2 border-white/15" onClick={onPdf}>
                <Download className="h-4 w-4" />
                {t('triage.downloadPdf')}
              </Button>
              {pdfErr ? <span className="self-center text-xs text-aegis-warning">{pdfErr}</span> : null}
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2 border-white/15"
                onClick={() => navigate('/risk', { state: { message: chief } })}
              >
                <Activity className="h-4 w-4" />
                {t('triage.openRisk')}
              </Button>
              {topic ? (
                <Link to={`/first-aid?topic=${topic}`}>
                  <Button type="button" variant="outline" className="w-full justify-start gap-2 border-white/15 sm:w-auto">
                    <Link2 className="h-4 w-4" />
                    {t('triage.openFirstAid')}
                  </Button>
                </Link>
              ) : null}
              <Link to="/hospitals">
                <Button type="button" variant="outline" className="w-full justify-start gap-2 border-white/15 sm:w-auto">
                  <Hospital className="h-4 w-4" />
                  {t('triage.openHospitals')}
                </Button>
              </Link>
              {urgent ? (
                <Link to="/sos">
                  <Button type="button" className="w-full justify-start gap-2 bg-aegis-red hover:bg-aegis-red/90 sm:w-auto">
                    <Siren className="h-4 w-4" />
                    {t('triage.openSos')}
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
