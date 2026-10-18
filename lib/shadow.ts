'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ---------- comparação palavra por palavra ---------- */

export const norm = (w: string) =>
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

/* ---------- gravação + avaliação ---------- */

export type Take = { url: string | null; heard: string; via: 'browser' | 'server' | 'none' };
type Mode = 'both' | 'server' | 'sr-only' | 'rec-only' | 'none';

const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

/** Converte a gravação (webm/mp4) em WAV 16 kHz mono: leve e aceito por qualquer serviço de transcrição. */
async function toWav(blob: Blob): Promise<{ b64: string; mime: string }> {
  const raw = await blob.arrayBuffer();
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const buf: AudioBuffer = await ctx.decodeAudioData(raw.slice(0));
    ctx.close?.();
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.ceil(buf.duration * rate), rate);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const w = (o: number, t: string) => [...t].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF');
    out.setUint32(4, 36 + pcm.length * 2, true);
    w(8, 'WAVE');
    w(12, 'fmt ');
    out.setUint32(16, 16, true);
    out.setUint16(20, 1, true);
    out.setUint16(22, 1, true);
    out.setUint32(24, rate, true);
    out.setUint32(28, rate * 2, true);
    out.setUint16(32, 2, true);
    out.setUint16(34, 16, true);
    w(36, 'data');
    out.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
    return { b64: b64(new Uint8Array(out.buffer)), mime: 'audio/wav' };
  } catch {
    return { b64: b64(new Uint8Array(raw)), mime: (blob.type || 'audio/webm').split(';')[0] };
  }
}
function b64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Observa o volume do microfone: depois que a pessoa falou, 1 s de silêncio encerra a gravação. */
function watchSilence(stream: MediaStream, onSilence: () => void) {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    let spoke = false;
    let quietSince = 0;
    const t0 = performance.now();
    const id = setInterval(() => {
      const live = stream.getAudioTracks().some((t) => t.readyState === 'live');
      if (!live) return finish();
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (rms > 0.03) {
        spoke = true;
        quietSince = 0;
      } else if (spoke && now - t0 > 700) {
        quietSince ||= now;
        if (now - quietSince > 1000) {
          finish();
          onSilence();
        }
      }
    }, 100);
    function finish() {
      clearInterval(id);
      ctx.close?.();
    }
  } catch {}
}

let serverCheck: Promise<boolean> | null = null;
const serverStt = () =>
  (serverCheck ||= fetch('/api/transcribe')
    .then((r) => r.json())
    .then((d) => !!d.enabled)
    .catch(() => false));

/**
 * Grava a voz (para ouvir de volta) e descobre o que foi dito (para comparar com a linha).
 * - Computador e iPhone: grava e reconhece ao mesmo tempo, no próprio navegador.
 * - Android: o Chrome não deixa os dois usarem o microfone juntos. Se o servidor tiver transcrição
 *   (chave do Gemini), grava e manda o áudio para avaliar; senão, só reconhece (sem gravação para ouvir).
 * - Se o navegador gravou mas não entendeu nada, e o servidor puder, a gravação vai para o servidor.
 */
export function useShadowRec(locale: string, lang: string) {
  const [state, setState] = useState<'idle' | 'rec' | 'stt'>('idle');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('none');
  const [server, setServer] = useState(false);
  const [ready, setReady] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const sr = useRef<any>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const heard = useRef('');
  const timer = useRef<any>(null);
  const finish = useRef<((t: Take) => void) | null>(null);
  const pending = useRef(0);
  const url = useRef<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    const canRec = !!navigator.mediaDevices?.getUserMedia && 'MediaRecorder' in window;
    const canSR = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    serverStt().then((srv) => {
      if (!alive.current) return;
      setServer(srv);
      if (isAndroid()) setMode(canRec && srv ? 'server' : canSR ? 'sr-only' : canRec ? 'rec-only' : 'none');
      // iPhone: gravar e reconhecer juntos costuma devolver vazio (sobretudo em palavras curtas); o servidor é mais confiável
      else if (isIOS() && canRec && srv) setMode('server');
      else setMode(canRec && canSR ? 'both' : canRec ? (srv ? 'server' : 'rec-only') : canSR ? 'sr-only' : 'none');
      setReady(true);
    });
    return () => {
      alive.current = false;
    };
  }, []);

  const transcribe = async (b: Blob): Promise<string> => {
    const { b64: audio, mime } = await toWav(b);
    const r = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang, audio, mime }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
    return String(d.text || '');
  };

  const done = useCallback(async () => {
    pending.current--;
    if (pending.current !== 0) return; // ainda falta um, ou é um aviso repetido de fim
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    let text = heard.current.trim();
    let via: Take['via'] = text ? 'browser' : 'none';
    if (!text && blob.current && server) {
      setState('stt');
      try {
        text = (await transcribe(blob.current)).trim();
        via = text ? 'server' : 'none';
      } catch (e: any) {
        setError(e.message);
      }
    }
    if (!alive.current) return;
    setState('idle');
    const f = finish.current;
    finish.current = null;
    f?.({ url: url.current, heard: text, via });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, lang]);

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
      if (state !== 'idle' || mode === 'none') return;
      setError('');
      heard.current = '';
      chunks.current = [];
      blob.current = null;
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
      finish.current = onDone;
      pending.current = 0;

      // 1) gravação (para ouvir de volta e, se preciso, mandar ao servidor)
      if (mode === 'both' || mode === 'server' || mode === 'rec-only') {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          stream.current = s;
          const rec = new MediaRecorder(s);
          rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
          rec.onstop = () => {
            if (chunks.current.length) {
              blob.current = new Blob(chunks.current, { type: rec.mimeType });
              url.current = URL.createObjectURL(blob.current);
            }
            done();
          };
          mr.current = rec;
          rec.start();
          pending.current++;
          // sem reconhecimento do navegador para avisar o fim: para sozinho depois de ~1 s de silêncio
          if (mode !== 'both') watchSilence(s, () => rec.state === 'recording' && rec.stop());
        } catch (e: any) {
          setError(
            e?.name === 'NotAllowedError'
              ? 'Permita o uso do microfone para este site (no cadeado ao lado do endereço).'
              : 'Não consegui abrir o microfone.'
          );
        }
      }

      // 2) reconhecimento do próprio navegador
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR && (mode === 'both' || mode === 'sr-only')) {
        try {
          const r = new SR();
          r.lang = locale;
          r.interimResults = true;
          r.continuous = mode !== 'sr-only'; // no Android o modo contínuo repete frases
          r.maxAlternatives = 1;
          r.onresult = (e: any) => {
            let finals = '';
            let interim = '';
            for (let i = 0; i < e.results.length; i++) {
              if (e.results[i].isFinal) finals += ' ' + e.results[i][0].transcript;
              else interim += ' ' + e.results[i][0].transcript;
            }
            heard.current = (finals || interim).trim();
          };
          r.onerror = (e: any) => {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
              setError('Permita o uso do microfone para este site.');
          };
          r.onend = () => {
            // o reconhecimento terminou (a pessoa parou de falar): encerra a gravação junto
            try {
              if (mr.current && mr.current.state === 'recording') mr.current.stop();
            } catch {}
            done();
          };
          sr.current = r;
          r.start();
          pending.current++;
        } catch {}
      }

      if (!pending.current) {
        finish.current = null;
        return;
      }
      setState('rec');
      timer.current = setTimeout(stop, maxMs);
    },
    [mode, locale, state, done, stop]
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

  return {
    state,
    error,
    mode,
    canRecord: mode === 'both' || mode === 'server' || mode === 'rec-only',
    canRecognize: mode === 'both' || mode === 'sr-only' || mode === 'server' || server,
    supported: !ready || mode !== 'none',
    ready,
    start,
    stop,
  };
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
