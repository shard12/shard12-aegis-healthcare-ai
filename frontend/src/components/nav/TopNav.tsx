import { NavLink } from 'react-router-dom';
import { Bell, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/hooks/useI18n';

/** Minimal top bar — navigation lives in the left sidebar only. */
export function TopNav() {
  const user = useAuthStore((s) => s.user);
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/60 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <NavLink to="/" className="flex items-center gap-3 transition hover:opacity-95 lg:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-aegis-red shadow-[0_0_24px_rgba(255,59,48,0.2)]">
            <Heart className="h-4 w-4 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display text-xs font-extrabold text-white">{t('nav.brand')}</div>
            <div className="text-[9px] font-bold tracking-[0.18em] text-white/40">{t('nav.tagline')}</div>
          </div>
        </NavLink>

        <div className="hidden flex-1 lg:block" aria-hidden />

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
            aria-label={t('nav.notifications')}
          >
            <Bell className="h-4 w-4" />
          </button>
          <NavLink
            to="/profile"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/85 transition hover:bg-white/[0.08]"
            title={t('nav.profile')}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500/90 to-indigo-600/80 text-[11px] font-extrabold text-white shadow-float">
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-[120px] truncate sm:inline">{user?.name || t('nav.profile')}</span>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
