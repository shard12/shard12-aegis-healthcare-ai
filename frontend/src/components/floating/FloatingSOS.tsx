import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useI18n } from '@/hooks/useI18n';
import { dispatchSos } from '@/services/api';
import { useUiStore } from '@/store/uiStore';

export function FloatingSOS() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const geo = useGeolocation(true);
  const setSosOpen = useUiStore((s) => s.setSosOpen);

  const onSos = async () => {
    setBusy(true);
    setStatus(t('floatSos.dispatching'));
    try {
      const res = await dispatchSos({
        lat: geo.lat ?? undefined,
        lng: geo.lng ?? undefined,
        accuracy: geo.accuracy ?? undefined,
        risk: 'MANUAL_SOS',
        notes: 'User triggered floating SOS',
        tracking: true,
      });
      setStatus(
        t('sos.deliveryLine', {
          tg: res.results.telegram.status,
          em: res.results.email.status,
        })
      );
      setSosOpen(true);
      nav('/sos');
    } catch (e) {
      if (isAxiosError(e) && (e.code === 'ECONNABORTED' || /timeout/i.test(String(e.message)))) {
        setStatus(t('floatSos.timeout'));
      } else {
        setStatus(t('floatSos.failed'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">
      {status ? <div className="max-w-[260px] rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[11px] text-white/70 shadow-float">{status}</div> : null}
      <motion.button
        type="button"
        aria-label={t('floatSos.aria')}
        onClick={onSos}
        disabled={busy}
        className="relative grid h-16 w-16 place-items-center rounded-full bg-aegis-red text-sm font-extrabold text-white shadow-neon"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="absolute inset-0 rounded-full bg-aegis-red/35 blur-xl" />
        {t('sos.button')}
      </motion.button>
    </div>
  );
}
