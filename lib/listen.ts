'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Reconhecimento de voz do próprio navegador (Chrome, Safari, Edge). */
export function useListen(locale: string, onText: (text: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<any>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => {
    const SR = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSupported(!!SR);
  }, []);

  const stop = useCallback(() => {
    try {
      rec.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setError('');
    const r = new SR();
    r.lang = locale;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      let text = '';
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      cb.current(text.trim(), final);
    };
    r.onerror = (e: any) => {
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Permita o uso do microfone para este site.'
          : e.error === 'no-speech'
            ? 'Não ouvi nada. Toque no microfone e fale.'
            : 'O reconhecimento de voz falhou. Tente de novo ou escreva.'
      );
    };
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [locale]);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, error, start, stop };
}
