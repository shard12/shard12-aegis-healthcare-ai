import type { UserSettings } from '@/types/aegis';
import { mergeUserSettings } from '@/lib/settingsDefaults';

/** Apply dark vs light shell on <html> (Tailwind-friendly + CSS overrides). */
export function applyAegisTheme(settings?: Partial<UserSettings> | null) {
  const s = mergeUserSettings(settings);
  const root = document.documentElement;
  const dark = s.darkMode !== false;
  root.dataset.aegisTheme = dark ? 'dark' : 'light';
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  const langMap: Record<string, string> = {
    en: 'en',
    hi: 'hi',
    kn: 'kn',
    ta: 'ta',
    te: 'te',
    mr: 'mr',
    zh: 'zh-CN',
    ja: 'ja',
  };
  root.lang = langMap[s.language] || 'en';
}
