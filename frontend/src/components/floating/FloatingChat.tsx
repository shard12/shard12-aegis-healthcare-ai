import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chat } from '@/services/api';
import { useSpeech } from '@/hooks/useSpeech';
import { useI18n } from '@/hooks/useI18n';

type Msg = { role: 'user' | 'assistant'; text: string };

export function FloatingChat() {
  const { t, lang } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const bottom = useMemo(() => (open ? '96px' : '24px'), [open]);
  const speech = useSpeech();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  const mut = useMutation({
    mutationFn: async (m: string) => chat(m, lang),
    onSuccess: (data) => {
      setMsgs((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      speech.speak(data.reply);
    },
    onError: (err: unknown) => {
      const t = tRef.current;
      let text: string;
      if (isAxiosError(err)) {
        if (err.response?.status === 401) text = t('floating.sessionExpired');
        else if (err.code === 'ECONNABORTED' || /timeout/i.test(String(err.message)))
          text = t('floating.chatFailed', { detail: 'Request timed out' });
        else if (!err.response) text = t('floating.apiUnreachable');
        else {
          const body = err.response.data as { error?: string } | undefined;
          const detail =
            (typeof body?.error === 'string' && body.error) ||
            `${err.response.status} ${err.response.statusText || ''}`.trim();
          text = t('floating.chatFailed', { detail });
        }
      } else if (err instanceof Error) text = t('floating.chatFailed', { detail: err.message });
      else text = t('floating.apiUnreachable');
      setMsgs((prev) => [...prev, { role: 'assistant', text }]);
    },
  });

  const send = async () => {
    if (mut.isPending) return;
    const m = input.trim();
    if (!m) return;
    setMsgs((prev) => [...prev, { role: 'user', text: m }]);
    setInput('');
    await mut.mutateAsync(m);
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label={t('floating.open')}
        className="fixed left-5 z-50 grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-aegis-blue/35 to-white/10 text-white shadow-float"
        style={{ bottom }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-6 w-6" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed bottom-24 left-5 z-50 w-[min(420px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-white/[0.06] glass shadow-glass"
            role="dialog"
            aria-label={t('floating.title')}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="text-sm font-extrabold tracking-wide">{t('floating.title')}</div>
              <button type="button" className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white" onClick={() => setOpen(false)} aria-label={t('floating.close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[46vh] space-y-3 overflow-y-auto px-4 py-3">
              {msgs.length === 0 ? <p className="text-sm text-white/60">{t('floating.hint')}</p> : null}
              {msgs.map((m, idx) => (
                <div key={`${idx}-${m.role}`} className={m.role === 'user' ? 'ml-8 rounded-2xl bg-white/5 px-3 py-2' : 'mr-8'}>
                  <p className="text-sm leading-relaxed text-white/80">{m.text}</p>
                </div>
              ))}
              {mut.isPending ? <div className="mr-8 text-sm text-white/50">{t('floating.thinking')}</div> : null}
              <div ref={endRef} />
            </div>
            <div className="flex items-center gap-2 border-t border-white/[0.06] p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('floating.placeholder')}
                aria-label={t('floating.placeholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !mut.isPending) void send();
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={t('floating.voice')}
                disabled={!speech.supported}
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
                className={speech.listening ? 'border-aegis-red/40 text-aegis-red' : ''}
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" onClick={send} disabled={mut.isPending} aria-label={t('floating.send')}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
