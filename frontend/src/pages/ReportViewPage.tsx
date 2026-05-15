import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fetchPublicReport } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Heart } from 'lucide-react';

export function ReportViewPage() {
  const { token } = useParams<{ token: string }>();
  const q = useQuery({
    queryKey: ['public-report', token],
    queryFn: () => fetchPublicReport(token || ''),
    enabled: Boolean(token),
  });

  const r = q.data;
  const viewUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0f] p-6 text-white/60">
        Loading report…
      </div>
    );
  }

  if (q.isError || !r) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0f] p-6 text-center">
        <div className="text-aegis-warning">Report not found or link expired.</div>
        <Link to="/login" className={cn(buttonVariants({ className: 'mt-4' }))}>
          Sign in to AEGIS
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-aegis-red">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold">AEGIS AI Report</div>
            <div className="text-xs text-white/45">Secure share link</div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{r.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.risk ? <Badge>{r.risk}</Badge> : null}
            {r.incidentId ? <div className="font-mono text-xs text-white/50">ID {r.incidentId}</div> : null}
            <p className="text-sm text-white/75">{r.summary}</p>
            <div className="text-xs text-white/40">{new Date(r.createdAt).toLocaleString()}</div>
            {r.pdfUrl ? (
              <a href={r.pdfUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ className: 'w-full' }))}>
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <QRCodeSVG value={viewUrl} size={160} bgColor="#0a0a0f" fgColor="#e8edf5" />
            <p className="text-center text-xs text-white/50">Scan to reopen this report on another device</p>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-white/35">
          AEGIS AI provides decision support only — not a licensed diagnosis. In emergencies, call your local emergency number.
        </p>
      </div>
    </div>
  );
}
