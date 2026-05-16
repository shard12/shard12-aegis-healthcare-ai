import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { 0: { transcript: string } };
  };
};

type SpeechHook = {
  supported: boolean;
  listening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  speak: (text: string) => void;
  cancelSpeak: () => void;
};

export function useSpeech(): SpeechHook {
  const recRef = useRef<Rec | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const supported = useMemo(() => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => unknown; SpeechRecognition?: new () => unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => unknown; SpeechRecognition?: new () => unknown };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR() as Rec;
    r.lang = document.documentElement.lang || 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (ev: SpeechRecognitionEventLike) => {
      let text = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      setTranscript(text.trim());
    };
    r.onend = () => setListening(false);
    recRef.current = r;
  }, []);

  const start = useCallback(() => {
    const r = recRef.current;
    if (!r) return;
    try {
      setTranscript('');
      setListening(true);
      r.lang = typeof document !== 'undefined' ? document.documentElement.lang || 'en-US' : 'en-US';
      r.start();
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    const r = recRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = typeof document !== 'undefined' ? document.documentElement.lang || 'en-US' : 'en-US';
    u.rate = 1;
    window.speechSynthesis.speak(u);
  }, []);

  const cancelSpeak = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { supported, listening, transcript, start, stop, speak, cancelSpeak };
}
