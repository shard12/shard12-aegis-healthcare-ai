import { NavLink } from 'react-router-dom';
import {
  Heart,
  FileStack,
  HelpCircle,
  History,
  Home,
  Hospital,
  LogOut,
  Pill,
  ScanLine,
  Settings,
  Siren,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/hooks/useI18n';

const links = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/scanner', labelKey: 'nav.scanner', icon: ScanLine },
  { to: '/triage', labelKey: 'nav.triage', icon: Stethoscope },
  { to: '/sos', labelKey: 'nav.sos', icon: Siren, danger: true },
  { to: '/hospitals', labelKey: 'nav.hospitals', icon: Hospital },
  { to: '/medicines', labelKey: 'nav.medicines', icon: Pill },
  { to: '/history', labelKey: 'nav.history', icon: History },
  { to: '/reports', labelKey: 'nav.reports', icon: FileStack },
  { to: '/help', labelKey: 'nav.help', icon: HelpCircle },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
] as const;

export function SidebarNav() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useI18n();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-white/[0.06] bg-black/50 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-aegis-red shadow-neon">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-display text-sm font-extrabold text-white">{t('nav.brand')}</div>
          <div className="text-[9px] font-bold tracking-[0.2em] text-white/40">{t('nav.tagline')}</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={t('nav.primaryAria')}>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className="block">
            {({ isActive }) => (
              <span
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition',
                  isActive
                    ? 'bg-gradient-to-r from-aegis-blue/25 to-violet-500/15 text-white shadow-float'
                    : 'text-white/55 hover:bg-white/[0.06] hover:text-white',
                  'danger' in l && l.danger && !isActive && 'text-aegis-red/90 hover:text-aegis-red'
                )}
              >
                <l.icon className="h-4 w-4 shrink-0" />
                {t(l.labelKey)}
                {isActive ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-aegis-blue shadow-[0_0_8px_rgba(10,132,255,0.8)]" />
                ) : null}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <NavLink
          to="/profile"
          className="mb-2 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/80"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-extrabold">
            {(user?.name || 'U').slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate">{user?.name || t('nav.profile')}</span>
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
