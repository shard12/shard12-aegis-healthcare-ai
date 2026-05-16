import { useI18n } from '@/hooks/useI18n';

type Props = { kind: 'terms' | 'privacy' };

export function LegalPage({ kind }: Props) {
  const { t } = useI18n();
  const isTerms = kind === 'terms';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-xs font-extrabold tracking-[0.3em] text-white/45">LEGAL</div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
          {isTerms ? t('legal.termsTitle') : t('legal.privacyTitle')}
        </h1>
        <p className="text-sm text-white/50">{t('legal.updated')}</p>
      </div>

      <section className="space-y-4 text-sm leading-relaxed text-white/75">
        {(isTerms ? t('legal.termsBody') : t('legal.privacyBody'))
          .split('\n\n')
          .map((para, i) => (
            <p key={i}>{para}</p>
          ))}
      </section>

      <p className="text-xs text-white/40">
        Contact: <a className="text-aegis-blue hover:underline" href="mailto:aegisai.alerts@gmail.com">aegisai.alerts@gmail.com</a> · +91 9742290862
      </p>
    </div>
  );
}
