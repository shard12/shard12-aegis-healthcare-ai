import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/hooks/useI18n';

export function AuthCallbackPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const oauthComplete = useAuthStore((s) => s.oauthComplete);
  const logout = useAuthStore((s) => s.logout);
  const [msg, setMsg] = useState(() => t('auth.securing'));

  useEffect(() => {
    setMsg(t('auth.securing'));
  }, [t]);

  useEffect(() => {
    const err = params.get('error');
    const token = params.get('token');
    if (err) {
      setMsg(t('auth.redirecting'));
      nav(`/login?error=${encodeURIComponent(err)}`, { replace: true });
      return;
    }
    if (!token) {
      nav('/login?error=missing_token', { replace: true });
      return;
    }
    void (async () => {
      try {
        await oauthComplete(token);
        nav('/', { replace: true });
      } catch {
        logout();
        nav('/login?error=session_failed', { replace: true });
      }
    })();
  }, [params, nav, oauthComplete, logout]);

  return (
    <div className="grid min-h-full place-items-center bg-black px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0a0a0a] p-8 text-center shadow-glass"
      >
        <motion.div
          className="mx-auto h-12 w-12 rounded-2xl bg-aegis-red/20"
          animate={{ boxShadow: ['0 0 0 rgba(255,59,48,0)', '0 0 28px rgba(255,59,48,0.35)', '0 0 0 rgba(255,59,48,0)'] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
        />
        <p className="mt-5 text-sm font-semibold text-white">{msg}</p>
        <p className="mt-2 text-xs text-white/45">{t('auth.googleLine')}</p>
      </motion.div>
    </div>
  );
}
