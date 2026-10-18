'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------- comparação palavra por palavra ---------- */

const norm = (w: string) =>
  w
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');

/** Quebra em palavras mantendo o texto original para exibir ("l'amore" vira "l'" + "amore"). */
export function words(text: string): { raw: string; n: string }[] {
  return (text.match(/[^\s'’]+['’]?/g) || []).map((raw) => ({ raw, n: norm(raw) })).filter((w) => w.n);
}

export type WordHit = { raw: string; ok: boolean };

/** Alinha o que foi ouvido com a linha (maior subsequência comum) e diz quais palavras saíram. */
export function compare(target: string, heard: string): { hits: WordHit[]; score: number } {
  const a = words(target);
  const b = words(heard);
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const same = (x: string, y: string) => x === y || (x.length > 3 && y.length > 3 && near(x, y));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = same(a[i].n, b[j].n) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (same(a[i].n, b[j].n)) {
      ok[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const hits = a.map((w, k) => ({ raw: w.raw, ok: ok[k] }));
  const score = m ? Math.round((100 * ok.filter(Boolean).length) / m) : 0;
  return { hits, score };
}

/** Uma letra de diferença em palavra longa ainda conta (o reconhecedor erra terminações). */
function near(x: string, y: string) {
  if (Math.abs(x.length - y.length) > 1) return false;
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return x.slice(i + 1) === y.slice(i + 1) || x.slice(i + 1) === y.slice(i) || x.slice(i) === y.slice(i + 1);
}

/* ---------- gravação + reconhecimento ao mesmo tempo ---------- */

export type Take = { url: string | null; heard: string };

/**
 * Grava a voz (para ouvir de volta) e, em paralelo, pede ao navegador para reconhecer o que foi dito
 * (para comparar com a linha). Se um dos dois não existir no aparelho, o outro funciona sozinho.
 */
export function useShadowRec(locale: string) {
  const [state, setState] = useState<'idle' | 'rec'>('idle');
  const [error, setError] = useState('');
  const [canRecord, setCanRecord] = useState(false);
  const [canRecognize, setCanRecognize] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const sr = useRef<any>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const heard = useRef('');
  const timer = useRef<any>(null);
  const finish = useRef<((t: Take) => void) | null>(null);
  const pending = useRef(0);
  const url = useRef<string | null>(null);

  useEffect(() => {
    setCanRecord(typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window);
    setCanRecognize(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }, []);

  const done = useCallback(() => {
    pending.current--;
    if (pending.current > 0) return;
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setState('idle');
    const f = finish.current;
    finish.current = null;
    f?.({ url: url.current, heard: heard.current.trim() });
  }, []);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    try {
      if (mr.current && mr.current.state !== 'inactive') mr.current.stop();
    } catch {}
    try {
      sr.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(
    async (maxMs: number, onDone: (t: Take) => void) => {
      if (state === 'rec') return;
      setError('');
      heard.current = '';
      chunks.current = [];
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
      finish.current = onDone;
      pending.current = 0;

      // 1) gravação
      if (canRecord) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          stream.current = s;
          const rec = new MediaRecorder(s);
          rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
          rec.onstop = () => {
            if (chunks.current.length) url.current = URL.createObjectURL(new Blob(chunks.current, { type: rec.mimeType }));
            done();
          };
          mr.current = rec;
          rec.start();
          pending.current++;
        } catch (e: any) {
          setError(
            e?.name === 'NotAllowedError'
              ? 'Permita o uso do microfone para este site (no cadeado ao lado do endereço).'
              : 'Não consegui abrir o microfone.'
          );
        }
      }

      // 2) reconhecimento
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        try {
          const r = new SR();
          r.lang = locale;
          r.interimResults = true;
          r.continuous = true;
          r.maxAlternatives = 1;
          let finals = '';
          r.onresult = (e: any) => {
            let interim = '';
            finals = '';
            for (let i = 0; i < e.results.length; i++) {
              if (e.results[i].isFinal) finals += ' ' + e.results[i][0].transcript;
              else interim += ' ' + e.results[i][0].transcript;
            }
            heard.current = (finals + interim).trim();
          };
          r.onerror = (e: any) => {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
              setError('Permita o uso do microfone para este site.');
          };
          r.onend = () => done();
          sr.current = r;
          r.start();
          pending.current++;
        } catch {}
      }

      if (!pending.current) {
        finish.current = null;
        if (!canRecord && !SR) setError('Este navegador não grava nem reconhece voz. Tente o Chrome ou o Safari.');
        return;
      }
      setState('rec');
      timer.current = setTimeout(stop, maxMs);
    },
    [canRecord, locale, state, done, stop]
  );

  useEffect(
    () => () => {
      finish.current = null;
      stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [stop]
  );

  return { state, error, canRecord, canRecognize, supported: canRecord || canRecognize, start, stop };
}

/* ---------- melhores notas por linha (neste aparelho) ---------- */

const key = (uid: string, lang: string, song: string) => `ascolto-shadow:${uid}:${lang}:${song}`;
export function loadBest(uid: string, lang: string, song: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key(uid, lang, song)) || '{}') || {};
  } catch {
    return {};
  }
}
export function saveBest(uid: string, lang: string, song: string, best: Record<string, number>) {
  try {
    localStorage.setItem(key(uid, lang, song), JSON.stringify(best));
  } catch {}
}
