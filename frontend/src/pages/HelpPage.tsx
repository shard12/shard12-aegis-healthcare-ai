import { Mail, Phone, FileText, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PHONE = '9742290862';
const EMAIL = 'aegisai.alerts@gmail.com';

export function HelpPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">{t('help.kicker')}</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t('help.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">{t('help.sub')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-aegis-blue/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-aegis-blue" />
              {t('help.phone')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a href={`tel:+91${PHONE}`} className="font-display text-2xl font-extrabold text-white hover:text-aegis-blue">
              +91 {PHONE}
            </a>
            <p className="mt-2 text-xs text-white/50">{t('help.phoneHint')}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-emerald-400" />
              {t('help.email')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a href={`mailto:${EMAIL}`} className="text-lg font-bold text-aegis-blue hover:underline">
              {EMAIL}
            </a>
            <p className="mt-2 text-xs text-white/50">{t('help.emailHint')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('help.faqTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-white/75">
          <div>
            <div className="font-bold text-white">{t('help.faqPdf')}</div>
            <p className="mt-1 text-white/60">{t('help.faqPdfA')}</p>
          </div>
          <div>
            <div className="font-bold text-white">{t('help.faqTelegram')}</div>
            <p className="mt-1 text-white/60">{t('help.faqTelegramA')}</p>
          </div>
          <div>
            <div className="font-bold text-white">{t('help.faqHospitals')}</div>
            <p className="mt-1 text-white/60">{t('help.faqHospitalsA')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link to="/terms" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
          <FileText className="h-4 w-4" />
          {t('help.terms')}
        </Link>
        <Link to="/privacy" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
          <Shield className="h-4 w-4" />
          {t('help.privacy')}
        </Link>
      </div>
    </div>
  );
}
