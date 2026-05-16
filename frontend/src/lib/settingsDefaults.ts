import type { UserSettings } from '@/types/aegis';

export const SETTINGS_DEFAULTS: UserSettings = {
  language: 'en',
  darkMode: true,
  largeText: false,
  vibrations: true,
  telegramChatId: '',
  telegramGroupId: '',
  alertEmail: '',
  alertPhone: '',
};

export function mergeUserSettings(partial?: Partial<UserSettings> | null): UserSettings {
  return { ...SETTINGS_DEFAULTS, ...(partial || {}) };
}
