/** Persist UI language for guests (login) and sync with account settings when logged in. */
export const AEGIS_LOCALE_KEY = 'aegis_locale';

export const BCP47_LOCALE: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

export function getStoredLocale(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AEGIS_LOCALE_KEY);
}

export function setStoredLocale(lang: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AEGIS_LOCALE_KEY, lang);
  window.dispatchEvent(new Event('aegis-locale'));
}

export function getEffectiveLanguage(user?: { settings?: { language?: string } } | null): string {
  const fromAccount = user?.settings?.language;
  if (fromAccount) return fromAccount;
  return getStoredLocale() || 'en';
}
