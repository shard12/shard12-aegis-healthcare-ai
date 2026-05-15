import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { translate } from '@/i18n/strings';
import { getEffectiveLanguage, setStoredLocale } from '@/i18n/locale';

export function useI18n() {
  const user = useAuthStore((s) => s.user);
  const [, bump] = useState(0);
  useEffect(() => {
    const onLocale = () => bump((n) => n + 1);
    window.addEventListener('aegis-locale', onLocale);
    return () => window.removeEventListener('aegis-locale', onLocale);
  }, []);

  const lang = getEffectiveLanguage(user);
  return useMemo(() => {
    const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
    const setGuestLanguage = (code: string) => setStoredLocale(code);
    return { lang, t, setGuestLanguage };
  }, [lang]);
}
