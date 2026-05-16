import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Download, ScanLine, Send, Upload } from 'lucide-react';
import { analyzeMedicalImage } from '@/services/api';
import type { ImageAnalysisResult } from '@/types/aegis';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp';

const SCREEN_LABELS: Record<string, string> = {
  visible_abnormalities: 'Visible abnormalities',
  inflammation: 'Inflammation',
  fractures: 'Fractures',
  lesions: 'Lesions',
  tumors: 'Tumors',
  infections: 'Infections',
  tissue_irregularities: 'Tissue irregularities',
  neurological_if_mri: 'Neurological (MRI)',
};

function severityColor(sev: string) {
  const s = sev.toLowerCase();
  if (s === 'high') return 'border-aegis-red/50 bg-aegis-red/15 text-aegis-red';
  if (s === 'moderate') return 'border-aegis-warning/40 bg-aegis-warning/10 text-aegis-warning';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
}

function SeverityMeter({ severity }: { severity: string }) {
  const levels = ['Low', 'Moderate', 'High'];
  const idx = levels.findIndex((l) => l.toLowerCase() === severity.toLowerCase());
  const active = idx >= 0 ? idx : 1;
  return (
    <div className="flex gap-2">
      {levels.map((l, i) => (
        <div key={l} className="flex-1">
          <motion.div
            className={[
              'h-2 rounded-full',
              i <= active ? (i === 2 ? 'bg-aegis-red' : i === 1 ? 'bg-aegis-warning' : 'bg-emerald-500') : 'bg-white/10',
            ].join(' ')}
            animate={i <= active ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <div className="mt-1 text-center text-[10px] font-bold text-white/45">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function ScannerPage() {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const mut = useMutation({
    mutationFn: (f: File) => analyzeMedicalImage(f),
  });

  const onPick = useCallback(
    (f: File | null) => {
      if (!f) return;
      if (!ACCEPT.split(',').includes(f.type)) return;
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      mut.reset();
    },
    [mut]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  };

  const runScan = () => {
    if (file) mut.mutate(file);
  };

  const result: ImageAnalysisResult | undefined = mut.data?.analysis;
  const tgSent = mut.data?.telegramStatus === 'sent';

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('scanner.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('scanner.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">{t('scanner.sub')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass overflow-hidden border-white/[0.08]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-aegis-blue" />
              {t('scanner.uploadTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={[
                'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition',
                dragOver ? 'border-aegis-blue bg-aegis-blue/10 aegis-pulse' : 'border-white/15 bg-black/40 hover:border-aegis-blue/40',
              ].join(' ')}
            >
              {mut.isPending ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-black/70 backdrop-blur-sm">
                  <div className="aegis-scan-ring mb-4 h-20 w-20 rounded-full border-2 border-aegis-blue/30" />
                  <p className="text-sm font-extrabold text-aegis-blue">{t('scanner.analyzing')}</p>
                  <p className="mt-1 text-xs text-white/50">{t('scanner.analyzingSub')}</p>
                </div>
              ) : null}
              {preview ? (
                <img src={preview} alt="" className="max-h-48 rounded-2xl object-contain shadow-float" />
              ) : (
                <>
                  <Upload className="mb-3 h-10 w-10 text-aegis-blue/80" />
                  <p className="text-sm font-bold text-white/80">{t('scanner.dropHint')}</p>
                  <p className="mt-2 text-xs text-white/45">JPG · PNG · WEBP</p>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] || null)}
            />
            <Button type="button" className="w-full gap-2" disabled={!file || mut.isPending} onClick={runScan}>
              <ScanLine className="h-4 w-4" />
              {mut.isPending ? t('scanner.analyzing') : t('scanner.runScan')}
            </Button>
            {mut.isError ? (
              <p className="text-center text-sm text-aegis-warning">
                {(mut.error as Error)?.message || t('scanner.error')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {tgSent ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="aegis-emergency-pulse flex items-center gap-2 rounded-2xl border border-aegis-red/45 bg-aegis-red/10 px-4 py-3 text-sm font-extrabold text-aegis-red"
                  >
                    <Send className="h-4 w-4" />
                    Telegram emergency alert sent
                  </motion.div>
                ) : null}
                <Card className={cn('border-2', severityColor(result.severity), tgSent && 'aegis-emergency-pulse')}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge className={severityColor(result.severity)}>{result.severity}</Badge>
                      {result.emergency ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-aegis-red">
                          <AlertTriangle className="h-4 w-4" />
                          {t('scanner.emergency')}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4">
                      <SeverityMeter severity={result.severity} />
                    </div>
                    <p className="mt-4 text-lg font-extrabold text-white">{result.possible_condition}</p>
                    <p className="mt-2 text-sm text-white/60">
                      {t('scanner.confidence')}: <span className="text-white/90">{result.confidence}</span>
                    </p>

                    {result.observations?.length ? (
                      <motion.div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/30 p-4">
                        <div className="text-[11px] font-extrabold tracking-wide text-aegis-blue">{t('scanner.observations')}</div>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/75">
                          {result.observations.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </motion.div>
                    ) : null}

                    {result.finding_screen && Object.keys(result.finding_screen).length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                        <div className="text-[11px] font-extrabold tracking-wide text-white/45">{t('scanner.screening')}</div>
                        <div className="mt-3 grid gap-2 text-xs">
                          {Object.entries(result.finding_screen).map(([k, v]) =>
                            v ? (
                              <div key={k} className="rounded-xl border border-white/[0.04] bg-black/30 px-3 py-2">
                                <span className="font-bold text-white/55">{SCREEN_LABELS[k] || k}</span>
                                <p className="mt-1 text-white/80">{v}</p>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-aegis-blue/20 bg-aegis-blue/5 p-4">
                      <div className="text-[11px] font-extrabold tracking-wide text-aegis-blue">{t('scanner.nextAction')}</div>
                      <p className="mt-2 text-sm leading-relaxed text-white/80">{result.recommendation}</p>
                      {result.emergency ? (
                        <p className="mt-2 text-xs font-extrabold text-aegis-red">{t('scanner.emergencyCare')}</p>
                      ) : null}
                    </div>
                    <p className="mt-4 rounded-xl border border-white/[0.06] bg-black/30 p-3 text-xs text-white/50">{result.disclaimer}</p>
                  </CardContent>
                </Card>

                {mut.data?.pdf?.url ? (
                  <a
                    href={mut.data.pdf.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex w-full justify-center gap-2 border-white/15')}
                  >
                    <Download className="h-4 w-4" />
                    {t('scanner.downloadPdf')}
                  </a>
                ) : null}

              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="border-white/[0.06] bg-black/30">
                  <CardContent className="p-8 text-center text-sm text-white/50">{t('scanner.emptyResult')}</CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-center text-[11px] text-white/40">{t('scanner.safetyDisclaimer')}</p>
    </div>
  );
}
