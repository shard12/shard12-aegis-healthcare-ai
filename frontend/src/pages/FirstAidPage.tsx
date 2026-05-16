import { useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSpeech } from '@/hooks/useSpeech';
import { useI18n } from '@/hooks/useI18n';

const TOPIC_STEPS: Record<string, string[]> = {
  default: ['firstAid.steps.d0', 'firstAid.steps.d1', 'firstAid.steps.d2', 'firstAid.steps.d3', 'firstAid.steps.d4'],
  cpr: ['firstAid.steps.c0', 'firstAid.steps.c1', 'firstAid.steps.c2', 'firstAid.steps.c3'],
  stroke: ['firstAid.steps.st0', 'firstAid.steps.st1', 'firstAid.steps.st2', 'firstAid.steps.st3'],
  burns: ['firstAid.steps.bu0', 'firstAid.steps.bu1', 'firstAid.steps.bu2', 'firstAid.steps.bu3'],
  bleed: ['firstAid.steps.bl0', 'firstAid.steps.bl1', 'firstAid.steps.bl2', 'firstAid.steps.bl3'],
  seizure: ['firstAid.steps.sz0', 'firstAid.steps.sz1', 'firstAid.steps.sz2', 'firstAid.steps.sz3'],
  breathing: ['firstAid.steps.br0', 'firstAid.steps.br1', 'firstAid.steps.br2', 'firstAid.steps.br3'],
  fever: ['firstAid.steps.fv0', 'firstAid.steps.fv1', 'firstAid.steps.fv2'],
  choking: ['firstAid.steps.ch0', 'firstAid.steps.ch1', 'firstAid.steps.ch2', 'firstAid.steps.ch3'],
};

export function FirstAidPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const rawTopic = params.get('topic') || 'default';
  const topic = TOPIC_STEPS[rawTopic] ? rawTopic : 'default';
  const stepKeys = useMemo(() => TOPIC_STEPS[topic], [topic]);
  const steps = useMemo(() => stepKeys.map((k) => t(k)), [stepKeys, t]);
  const [idx, setIdx] = useState(0);
  const speech = useSpeech();

  const [cd, setCd] = useState<number | null>(null);
  useEffect(() => {
    if (cd == null) return;
    if (cd <= 0) {
      setCd(null);
      speech.speak(t('firstAid.voice.go'));
      return;
    }
    const timer = window.setTimeout(() => setCd(cd - 1), 900);
    return () => window.clearTimeout(timer);
  }, [cd, speech, t]);

  const [cpr, setCpr] = useState<number | null>(null);
  useEffect(() => {
    if (cpr == null) return;
    if (cpr <= 0) {
      setCpr(null);
      speech.speak(t('firstAid.voice.cycle'));
      return;
    }
    const timer = window.setTimeout(() => setCpr(cpr - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cpr, speech, t]);

  useLayoutEffect(() => {
    setIdx(0);
  }, [topic]);

  useEffect(() => {
    if (!steps[idx]) return;
    speech.speak(steps[idx]);
  }, [idx, speech, steps]);

  const cdLabel = useMemo(() => {
    if (cd == null) return t('firstAid.idle');
    if (cd === 0) return t('firstAid.go');
    return String(cd);
  }, [cd, t]);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('firstAid.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('firstAid.title')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('firstAid.sub')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('firstAid.countdownTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setCd(3)}>
            {t('firstAid.countdownStart')}
          </Button>
          <motion.div key={cdLabel} initial={{ scale: 0.85, opacity: 0.25 }} animate={{ scale: 1.05, opacity: 1 }} className="text-5xl font-black text-aegis-red">
            {cdLabel}
          </motion.div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('firstAid.cprTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => setCpr(120)} disabled={cpr != null}>
            {t('firstAid.cprStart')}
          </Button>
          <div className="font-mono text-3xl font-extrabold text-aegis-blue">{cpr != null ? `${Math.floor(cpr / 60)}:${String(cpr % 60).padStart(2, '0')}` : '00:00'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('firstAid.stepsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {steps.map((_, i) => (
              <button
                key={stepKeys[i]}
                type="button"
                onClick={() => setIdx(i)}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-extrabold',
                  i === idx ? 'border-aegis-blue/40 bg-aegis-blue/10 text-white' : 'border-white/10 bg-black/30 text-white/60 hover:text-white',
                ].join(' ')}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 text-lg font-extrabold text-white">
            {steps[idx]}
          </motion.div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIdx((v) => Math.max(0, v - 1))}>
              {t('firstAid.back')}
            </Button>
            <Button type="button" onClick={() => setIdx((v) => Math.min(steps.length - 1, v + 1))}>
              {t('firstAid.next')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => speech.speak(steps[idx])}>
              {t('firstAid.repeatVoice')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
