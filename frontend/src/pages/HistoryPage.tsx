import { useQuery } from '@tanstack/react-query';
import { fetchHistory, downloadIncidentPdf } from '@/services/api';
import { useI18n } from '@/hooks/useI18n';
import { BCP47_LOCALE } from '@/i18n/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { HistoryItem, TriageEnvelope } from '@/types/aegis';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useUiStore } from '@/store/uiStore';

export function HistoryPage() {
  const { t, lang } = useI18n();
  const geo = useGeolocation(false);
  const lastEnvelope = useUiStore((s) => s.lastEnvelope);
  const q = useQuery({ queryKey: ['history'], queryFn: () => fetchHistory() as Promise<HistoryItem[]> });

  const items = (q.data || []) as HistoryItem[];

  const onPdf = async (h: HistoryItem) => {
    const blob = await downloadIncidentPdf({
      historyId: h.id,
      symptoms: h.summary,
      envelope: (h.payload as TriageEnvelope | undefined) || lastEnvelope,
      lat: geo.lat,
      lng: geo.lng,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegis-report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('history.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('history.title')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('history.sub')}</p>
      </div>

      <div className="grid gap-3">
        {items.map((h) => (
          <Card key={h.id}>
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-display text-lg font-extrabold">{h.title}</div>
                  <Badge className="border-aegis-blue/30 text-aegis-blue">{h.risk}</Badge>
                </div>
                <div className="mt-2 text-xs text-white/50">{new Date(h.createdAt).toLocaleString(BCP47_LOCALE[lang] || BCP47_LOCALE.en)}</div>
                <div className="mt-3 grid gap-1 text-sm text-white/70">
                  <div>
                    {t('history.telegram')} {h.telegramStatus}
                  </div>
                  <div>
                    {t('history.email')} {h.emailStatus}
                  </div>
                  {h.incidentId ? (
                    <div className="font-mono text-xs text-white/45">ID {h.incidentId}</div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {h.reportPdfUrl ? (
                  <a
                    href={h.reportPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(buttonVariants({ variant: 'outline', size: 'md' }), 'text-center')}
                  >
                    Saved PDF
                  </a>
                ) : null}
                <Button type="button" variant="outline" onClick={() => onPdf(h)}>
                  {t('history.report')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!q.isLoading && items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-white/60">{t('history.empty')}</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
