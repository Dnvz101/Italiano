'use client';
import { useRef, useState } from 'react';
import { useCourse } from '@/lib/nav';
import { compare, norm, useShadowRec, words, type WordHit } from '@/lib/shadow';

/** Nota para uma fala curta. Com `accept`, qualquer forma aceita conta 100% (ex.: "acca" ou "H"). */
export function scoreSay(heard: string, target: string, accept?: string[]): { score: number; hits: WordHit[] } {
  const c = compare(target, heard);
  if (accept?.length) {
    const hw = words(heard).map((w) => w.n);
    const joined = hw.join('');
    if (
      accept.some((a) => {
        const n = norm(a.replace(/\s+/g, ''));
        return n && (hw.includes(n) || joined === n);
      })
    )
      return { score: 100, hits: c.hits.map((h) => ({ ...h, ok: true })) };
  }
  return c;
}

const tone = (n: number) => (n >= 90 ? 'ok' : n >= 60 ? 'mid' : 'low');

/**
 * Ouvir → repetir → nota, para uma letra ou palavra.
 * Usa a mesma gravação/avaliação do Shadowing (no Android, pelo servidor quando configurado).
 */
export default function SayIt({
  text,
  speakText,
  accept,
  best,
  onScore,
  compact = false,
}: {
  text: string; // o que comparar
  speakText?: string; // o que a voz fala (padrão: text)
  accept?: string[];
  best?: number;
  onScore: (score: number) => void;
  compact?: boolean;
}) {
  const { course, lang, speak } = useCourse();
  const rec = useShadowRec(course.meta.locale, lang);
  const [phase, setPhase] = useState<'idle' | 'model' | 'rec'>('idle');
  const [res, setRes] = useState<{ score: number | null; heard: string; url: string | null } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const say = speakText || text;
  const maxMs = Math.min(8000, 2600 + words(text).length * 700);

  const record = () => {
    setPhase('rec');
    rec.start(maxMs, (t) => {
      setPhase('idle');
      if (!t.heard) {
        setRes({ score: null, heard: '', url: t.url });
        return;
      }
      const { score } = scoreSay(t.heard, text, accept);
      setRes({ score, heard: t.heard, url: t.url });
      onScore(score);
    });
  };
  const go = () => {
    if (phase === 'rec') return rec.stop();
    setRes(null);
    setPhase('model');
    speak(say, undefined, () => setTimeout(record, 120));
  };
  const playMine = () => {
    if (!res?.url) return;
    audio.current?.pause();
    const a = new Audio(res.url);
    audio.current = a;
    a.play().catch(() => {});
  };

  const busy = phase === 'model' || rec.state === 'stt';
  return (
    <div className={`sayit ${compact ? 'compact' : ''}`}>
      <div className="sayit-row">
        <button className="spk" onClick={() => speak(say)} aria-label={`Ouvir ${say}`}>
          🔊
        </button>
        <button className="spk slow" onClick={() => speak(say, 0.55)} aria-label="Ouvir devagar">
          🐢
        </button>
        <button
          className={`btn sm sayit-go ${phase === 'rec' ? 'rec' : ''}`}
          onClick={go}
          disabled={busy || !rec.ready || !rec.supported}
        >
          {phase === 'model'
            ? '🔊 Ouça…'
            : rec.state === 'stt'
              ? '⏳ Avaliando…'
              : phase === 'rec'
                ? '⏺ Fale agora'
                : '🎙️ Repetir'}
        </button>
        {res?.score != null ? (
          <span className={`sayit-score ${tone(res.score)}`}>{res.score}%</span>
        ) : best != null ? (
          <span className={`sayit-best ${tone(best)}`} title="Sua melhor nota">
            {best}%
          </span>
        ) : null}
      </div>
      {res && (
        <div className="sayit-res mut">
          {res.score != null ? (
            <>
              Entendi: <i>"{res.heard}"</i>
            </>
          ) : (
            'Não entendi. Fale mais perto do microfone e tente de novo.'
          )}
          {res.url && (
            <button className="link" onClick={playMine}>
              ▶️ minha voz
            </button>
          )}
        </div>
      )}
      {rec.error && <div className="err">{rec.error}</div>}
    </div>
  );
}
