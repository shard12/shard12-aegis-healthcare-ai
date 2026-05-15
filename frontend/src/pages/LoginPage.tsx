import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowRight, ChevronDown, Heart, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { getGoogleOAuthStartUrl } from '@/services/api';
import { useI18n } from '@/hooks/useI18n';
import { translate } from '@/i18n/strings';

const LANG_IDS = ['en', 'hi', 'kn', 'ta', 'te', 'mr', 'zh', 'ja'] as const;

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z" />
      <path fill="#34A853" d="M3.3 7.1l3.3 2.4C7.4 6.8 9.5 5.5 12 5.5c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.5 12 2.5 8.1 2.5 4.7 4.5 3.3 7.1z" />
      <path fill="#4A90E2" d="M12 21.5c2.6 0 4.8-.9 6.4-2.4l-3-2.3c-.8.6-2 1.2-3.4 1.2-2.9 0-5.4-2-6.2-4.7l-3.1 2.4c1.5 2.9 4.6 4.8 8.3 4.8z" />
      <path fill="#FBBC05" d="M21.6 12.2c0-.8-.1-1.5-.3-2.2H12v4.3h5.4c-.3 1.3-1.1 2.4-2.4 3.1l3 2.3c1.8-1.7 2.9-4.1 2.9-7.2z" />
    </svg>
  );
}

export function LoginPage() {
  const { t, lang: uiLang, setGuestLanguage } = useI18n();
  const nav = useNavigate();
  const [search] = useSearchParams();
  const oauthErr = search.get('error');
  const token = useAuthStore((s) => s.token);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('login.emailInvalid')),
        password: z.string().min(8, t('login.passwordMin')),
      }),
    [t]
  );

  type Form = z.infer<typeof schema>;

  const { register: r, handleSubmit, formState, reset } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    reset({ email: '', password: '' });
  }, [schema, reset]);

  useEffect(() => {
    const map: Record<string, string> = {
      en: 'en',
      hi: 'hi',
      kn: 'kn',
      ta: 'ta',
      te: 'te',
      mr: 'mr',
      zh: 'zh-CN',
      ja: 'ja',
    };
    document.documentElement.lang = map[uiLang] || 'en';
  }, [uiLang]);

  const googleStart = useMemo(() => getGoogleOAuthStartUrl(), []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (bootstrapped && token) nav('/', { replace: true });
  }, [bootstrapped, token, nav]);

  const onLogin = handleSubmit(async (v) => {
    await login(v.email, v.password);
    nav('/');
  });

  const onRegister = handleSubmit(async (v) => {
    await register(v.email, v.password, 'Operator');
    nav('/');
  });

  const langLabel = (id: string) => translate(uiLang, `lang.${id}`);

  return (
    <div className="relative min-h-full overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-90" />
      <div className="relative mx-auto grid min-h-full max-w-6xl grid-cols-1 gap-12 px-4 py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex items-center gap-3">
            <motion.div
              className="grid h-11 w-11 place-items-center rounded-2xl bg-aegis-red shadow-[0_0_40px_rgba(255,59,48,0.25)]"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            >
              <Heart className="h-5 w-5 text-white" strokeWidth={2.2} />
            </motion.div>
            <div>
              <div className="font-display text-sm font-extrabold tracking-[0.18em] text-white">{t('login.brandLine')}</div>
              <div className="text-[11px] font-bold tracking-[0.28em] text-white/45">{t('login.brandTagline')}</div>
            </div>
          </div>

          <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
            {t('login.heroTitle')}{' '}
            <span className="bg-gradient-to-r from-aegis-red to-[#FF6B6B] bg-clip-text text-transparent">{t('login.heroHighlight')}</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">{t('login.heroSub')}</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a]/80 p-4 shadow-float backdrop-blur-md"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <ShieldCheck className="h-4 w-4 text-aegis-blue" />
                {t('login.featureSosTitle')}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{t('login.featureSosDesc')}</p>
            </motion.div>
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a]/80 p-4 shadow-float backdrop-blur-md"
            >
              <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Activity className="h-4 w-4 text-aegis-blue" />
                {t('login.featureTriageTitle')}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{t('login.featureTriageDesc')}</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="relative rounded-[28px] border border-white/[0.08] bg-[#0a0a0a]/90 p-7 shadow-glass backdrop-blur-2xl md:p-9"
        >
          <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.06] to-transparent" />
          <div className="relative">
            <div className="text-center">
              <div className="text-lg font-extrabold tracking-tight text-white">{t('login.welcomeTitle')}</div>
              <div className="mt-1 text-sm text-white/45">{t('login.welcomeSub')}</div>
            </div>

            <div className="mt-5">
              <Label className="mb-2 block text-left text-xs text-white/45" htmlFor="login-lang">
                {t('login.language')}
              </Label>
              <div className="relative">
                <select
                  id="login-lang"
                  className="h-11 w-full appearance-none rounded-2xl border border-white/[0.08] bg-black/50 px-4 pr-10 text-sm font-bold text-white outline-none focus:border-aegis-signin/40"
                  value={uiLang}
                  onChange={(e) => setGuestLanguage(e.target.value)}
                >
                  {LANG_IDS.map((id) => (
                    <option key={id} value={id}>
                      {langLabel(id)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            </div>

            <AnimatePresence>
              {oauthErr ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 rounded-xl border border-aegis-red/25 bg-aegis-red/10 px-3 py-2 text-center text-xs font-semibold text-aegis-red"
                >
                  {t('login.googleError')} {oauthErr}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.a
              href={googleStart}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 text-sm font-extrabold text-[#111] shadow-float transition hover:bg-white/95"
            >
              <GoogleMark />
              {t('login.continueGoogle')}
            </motion.a>

            <div className="my-7 flex items-center gap-3 text-[11px] font-bold tracking-[0.2em] text-white/35">
              <div className="h-px flex-1 bg-white/10" />
              {t('login.or')}
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form className="space-y-4" onSubmit={mode === 'signin' ? onLogin : onRegister}>
              <div>
                <Label htmlFor="email">{t('login.email')}</Label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input id="email" className="h-12 rounded-2xl border-white/[0.08] bg-black/50 pl-10" type="email" autoComplete="email" placeholder={t('login.emailPlaceholder')} {...r('email')} />
                </div>
                {formState.errors.email ? <p className="mt-1 text-xs text-aegis-red">{formState.errors.email.message}</p> : null}
              </div>
              <div>
                <Label htmlFor="password">{t('login.password')}</Label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    id="password"
                    className="h-12 rounded-2xl border-white/[0.08] bg-black/50 pl-10"
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder={t('login.passwordPlaceholder')}
                    {...r('password')}
                  />
                </div>
                {formState.errors.password ? <p className="mt-1 text-xs text-aegis-red">{formState.errors.password.message}</p> : null}
              </div>

              <motion.div layout className="pt-1">
                <Button type="submit" variant="signin" className="group h-12 w-full rounded-2xl text-[15px] font-extrabold" disabled={formState.isSubmitting}>
                  <span className="flex items-center justify-center gap-2">
                    {mode === 'signin' ? t('login.signIn') : t('login.createAccount')}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Button>
              </motion.div>
            </form>

            <p className="mt-6 text-center text-sm text-white/45">
              {mode === 'signin' ? (
                <>
                  {t('login.newTo')}{' '}
                  <button type="button" className="font-extrabold text-white/85 hover:text-white" onClick={() => setMode('register')}>
                    {t('login.createOne')}
                  </button>
                </>
              ) : (
                <>
                  {t('login.haveAccount')}{' '}
                  <button type="button" className="font-extrabold text-white/85 hover:text-white" onClick={() => setMode('signin')}>
                    {t('login.signInLink')}
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
