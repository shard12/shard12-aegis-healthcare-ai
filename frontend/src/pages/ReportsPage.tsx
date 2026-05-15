import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { FileText, QrCode } from 'lucide-react';
import { fetchReports, type ReportVaultItem } from '@/services/api';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ReportCard({ r }: { r: ReportVaultItem }) {
  const viewUrl = r.viewUrl || (r.accessToken ? `${window.location.origin}/reports/view/${r.accessToken}` : '');
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
          {viewUrl ? (
            <>
              <QRCodeSVG value={viewUrl} size={120} bgColor="#0a0a0f" fgColor="#e8edf5" level="M" />
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-white/45">
                <QrCode className="h-3 w-3" /> SCAN
              </div>
            </>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-display text-lg font-extrabold">{r.title}</div>
            <Badge className="border-aegis-blue/30 text-aegis-blue">{r.kind}</Badge>
            {r.risk ? <Badge>{r.risk}</Badge> : null}
          </div>
          {r.incidentId ? <div className="mt-1 font-mono text-xs text-white/45">{r.incidentId}</div> : null}
          <p className="mt-2 line-clamp-3 text-sm text-white/65">{r.summary || '—'}</p>
          <div className="mt-1 text-xs text-white/40">{new Date(r.createdAt).toLocaleString()}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {r.pdfUrl ? (
              <a href={r.pdfUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                <FileText className="mr-1 h-4 w-4" /> PDF
              </a>
            ) : null}
            {viewUrl ? (
              <a href={viewUrl} className={cn(buttonVariants({ size: 'sm' }))}>
                Open report page
              </a>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['reports'], queryFn: fetchReports });

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('reports.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('reports.title')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('reports.sub')}</p>
      </div>

      {q.isLoading ? <div className="text-sm text-white/50">{t('reports.loading')}</div> : null}
      {q.isError ? (
        <Card>
          <CardContent className="p-5 text-sm text-aegis-warning">{t('reports.error')}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {(q.data || []).map((r) => (
          <ReportCard key={r.id} r={r} />
        ))}
      </div>

      {!q.isLoading && (q.data || []).length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.emptyTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-white/60">{t('reports.empty')}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
