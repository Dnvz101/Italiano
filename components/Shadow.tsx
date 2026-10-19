'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { isCjk, loadBest, saveBest, scoreLine, useShadowRec, words, type WordHit } from '@/lib/shadow';
import { ro } from '@/lib/kana';
import Jt from './Jt';

type Line = { t: string; ai?: string; kana?: string };

const verdict = (n: number) =>
  n >= 90 ? 'Perfeito! 🎉' : n >= 70 ? 'Muito bom!' : n >= 40 ? 'Quase lá, repita mais uma.' : 'Ouça de novo, devagar 🐢, e repita.';
const tone = (n: number) => (n >= 90 ? 'ok' : n >= 60 ? 'mid' : 'low');

/**
 * Shadowing: ouvir a linha e repetir logo em seguida, imitando ritmo e entonação.
 * Grava a pessoa para ela se ouvir, e o reconhecimento de voz mostra quais palavras saíram claras.
 */
export default function Shadow({
  lines,
  order,
  songKey,
  startAt,
  onLine,
}: {
  lines: Line[];
  order: number[]; // índices das linhas que entram (todas ou só o refrão)
  songKey: string;
  startAt: number;
  onLine: (i: number) => void;
}) {
  const s = useStore();
  const { lang, course, speak } = useCourse();
  const rec = useShadowRec(course.meta.locale, lang);

  const [pos, setPos] = useState(() => Math.max(0, order.indexOf(startAt)));
  const [slow, setSlow] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'model' | 'rec' | 'done'>('idle');
  const [take, setTake] = useState<{ url: string | null; heard: string; hits: WordHit[]; score: number | null } | null>(null);
  const [best, setBest] = useState<Record<string, number>>({});
  const [showTr, setShowTr] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const marked = useRef(false);

  useEffect(() => setBest(loadBest(s.userId, lang, songKey)), [s.userId, lang, songKey]);
  useEffect(() => {
    const p = order.indexOf(startAt);
    if (p >= 0) setPos(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAt]);

  const idx = order[Math.min(pos, order.length - 1)];
  const line = lines[idx];
  const rate = slow ? 0.6 : undefined;
  const cjk = isCjk(line?.t || '');
  const readLine = cjk ? ro(line?.kana || line?.t || '') : '';
  const maxMs = useMemo(() => Math.min(20000, 3500 + words(line?.t || '').length * (slow ? 900 : 650)), [line, slow]);

  // trocou de linha: limpa a tentativa anterior
  useEffect(() => {
    setTake(null);
    setPhase('idle');
    setShowTr(false);
    onLine(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!line) return null;

  const record = () => {
    setPhase('rec');
    rec.start(maxMs, (t) => {
      const c = t.heard ? scoreLine(line.t, t.heard, t.kana, line.kana) : null;
      setTake({ url: t.url, heard: t.heard, hits: c?.hits || [], score: c ? c.score : null });
      setPhase('done');
      if (c && c.score > (best[line.t] || 0)) {
        const nb = { ...best, [line.t]: c.score };
        setBest(nb);
        saveBest(s.userId, lang, songKey, nb);
      }
      if (!marked.current && (t.url || t.heard)) {
        marked.current = true;
        s.markDay();
      }
    });
  };

  const listenAndRepeat = () => {
    if (phase === 'rec') return rec.stop();
    stopAudio();
    setPhase('model');
    speak(line.t, rate, () => setTimeout(record, 150));
  };

  const stopAudio = () => {
    audio.current?.pause();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  };

  const playMine = (after?: () => void) => {
    if (!take?.url) return;
    stopAudio();
    const a = new Audio(take.url);
    audio.current = a;
    if (after) a.onended = after;
    a.play().catch(() => {});
  };

  const compareBoth = () => {
    stopAudio();
    speak(line.t, rate, () => setTimeout(() => playMine(), 250));
  };

  const go = (d: number) => {
    stopAudio();
    if (phase === 'rec') rec.stop();
    setPos((p) => Math.min(order.length - 1, Math.max(0, p + d)));
  };

  const scored = order.filter((i) => best[lines[i].t] != null);
  const avg = scored.length ? Math.round(scored.reduce((a, i) => a + best[lines[i].t], 0) / scored.length) : null;

  return (
    <div className="shadow">
      <div className="sh-top mut">
        <span>
          Linha <b>{pos + 1}</b> de {order.length}
        </span>
        {avg != null && (
          <span>
            Média <b>{avg}%</b> em {scored.length} {scored.length === 1 ? 'linha' : 'linhas'}
          </span>
        )}
      </div>

      <div className={`sh-line ${phase}`}>
        <p className="sh-t" lang={course.meta.lang}>
          {take && take.score != null
            ? take.hits.map((h, k) => (
                <span key={k} className={h.ok ? 'w-ok' : 'w-miss'}>
                  {h.raw}
                  {cjk ? '' : ' '}
                </span>
              ))
            : <Jt text={line.t} />}
        </p>
        {cjk && readLine && <p className="sh-ro">{readLine}</p>}
        {line.ai &&
          (showTr ? (
            <p className="sh-tr">{line.ai}</p>
          ) : (
            <button className="link" onClick={() => setShowTr(true)}>
              ver tradução
            </button>
          ))}
        {best[line.t] != null && !take && <span className={`sh-best ${tone(best[line.t])}`}>melhor: {best[line.t]}%</span>}
      </div>

      <button
        className={`btn sh-go ${phase === 'rec' ? 'rec' : ''}`}
        onClick={listenAndRepeat}
        disabled={phase === 'model' || rec.state === 'stt' || !rec.ready || !rec.supported}
        aria-live="polite"
      >
        {phase === 'model'
          ? '🔊 Ouça…'
          : rec.state === 'stt'
            ? '⏳ Avaliando sua pronúncia…'
            : phase === 'rec'
              ? '⏺ Repita agora · toque para parar'
              : take
                ? '🔁 Ouvir e repetir de novo'
                : '▶️ Ouvir e repetir'}
      </button>
      {phase === 'rec' && rec.state === 'rec' && (
        <div className="sh-bar" aria-hidden="true">
          <i style={{ animationDuration: `${maxMs}ms` }} />
        </div>
      )}

      <div className="row sh-row">
        <label className="switch">
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> 🐢 Devagar
        </label>
        <button className="btn ghost sm" onClick={() => speak(line.t, rate)} disabled={phase === 'rec'}>
          🔊 Só ouvir
        </button>
        <button className="btn ghost sm" onClick={record} disabled={phase === 'rec' || phase === 'model' || !rec.ready || !rec.supported}>
          🎙️ Só gravar
        </button>
      </div>

      {phase === 'done' && take && (
        <div className="sh-res pop">
          {take.score != null ? (
            <>
              <div className={`sh-score ${tone(take.score)}`}>
                <b>{take.score}%</b> <span>{verdict(take.score)}</span>
              </div>
              <p className="mut">
                O app entendeu: <i>"{take.heard}"</i>. Palavras em laranja não saíram claras: ouça de novo prestando atenção nelas.
              </p>
            </>
          ) : (
            <p className="mut">
              {rec.canRecognize
                ? 'Não consegui entender a gravação. Fale mais perto do microfone, ou só ouça e compare.'
                : 'Este navegador não dá nota, mas você pode se ouvir e comparar com o modelo.'}
            </p>
          )}
          {take.url && (
            <div className="row">
              <button className="btn ghost sm" onClick={() => playMine()}>
                ▶️ Minha voz
              </button>
              <button className="btn ghost sm" onClick={compareBoth}>
                🎧 Modelo + eu
              </button>
            </div>
          )}
        </div>
      )}
      {rec.error && <p className="err">{rec.error}</p>}
      {rec.mode === 'sr-only' && (
        <p className="mut sh-tip">
          Neste celular o app avalia a pronúncia, mas não guarda a gravação para você se ouvir (o Android não deixa fazer
          os dois ao mesmo tempo).
        </p>
      )}
      {rec.ready && !rec.supported && (
        <p className="mut">Este navegador não grava áudio. No celular, use o Chrome (Android) ou o Safari (iPhone).</p>
      )}

      <div className="row sh-nav">
        <button className="btn ghost sm" onClick={() => go(-1)} disabled={pos === 0}>
          ← Anterior
        </button>
        <button className="btn sm" onClick={() => go(1)} disabled={pos >= order.length - 1}>
          Próxima →
        </button>
      </div>

      <div className="sh-dots" role="group" aria-label="Linhas">
        {order.map((i, k) => {
          const b = best[lines[i].t];
          return (
            <button
              key={i}
              className={`sh-dot ${k === pos ? 'on' : ''} ${b != null ? tone(b) : ''}`}
              onClick={() => setPos(k)}
              aria-label={`Linha ${k + 1}${b != null ? `, melhor ${b}%` : ''}`}
            >
              {k + 1}
            </button>
          );
        })}
      </div>
      <p className="mut sh-tip">
        Dica: não leia, <b>imite</b>. Copie o ritmo, a melodia e onde a voz sobe e desce. Primeiro com 🐢, depois na velocidade
        normal, depois cantando junto com a música.
      </p>
    </div>
  );
}
