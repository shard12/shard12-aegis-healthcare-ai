import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { translate } from '@/i18n/strings';
import { getEffectiveLanguage } from '@/i18n/locale';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);
  const lang = getEffectiveLanguage(user);
  const loc = useLocation();

  if (!bootstrapped) return <div className="p-10 text-center text-sm text-white/60">{translate(lang, 'protected.booting')}</div>;
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}
