'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { ALPHABET } from '@/lib/alphabet';
import SayIt from './SayIt';
import KanaWrite from './KanaWrite';

const KEY = (uid: string, lang: string) => `ascolto-alpha:${uid}:${lang}`;
const tone = (n?: number) => (n == null ? '' : n >= 90 ? 'ok' : n >= 60 ? 'mid' : 'low');

/** Alfabeto e sons difíceis: ouvir, repetir e ganhar nota, letra por letra. */
/** mode="write": só o treino de escrever de memória; noWrite: esconde a aba Escrever (quando ela já está em outro lugar). */
export default function Alphabet({ only, mode, noWrite }: { only?: number; mode?: 'write'; noWrite?: boolean } = {}) {
  const s = useStore();
  const { lang } = useCourse();
  const data = ALPHABET[lang];
  const [view, setView] = useState<number | 'sounds' | 'write'>(mode === 'write' ? 'write' : only ?? 0);
  const [showWrite, setShowWrite] = useState(false);
  const [wset, setWset] = useState(only ?? 0);
  const [wi, setWi] = useState(0);
  const [sel, setSel] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});
  const detail = useRef<HTMLDivElement>(null);
  const marked = useRef(false);

  useEffect(() => {
    try {
      setBest(JSON.parse(localStorage.getItem(KEY(s.userId, lang)) || '{}') || {});
    } catch {}
  }, [s.userId, lang]);

  if (!data) return <p className="mut">Ainda não há alfabeto para este idioma.</p>;

  const save = (k: string, v: number) => {
    setBest((b) => {
      if ((b[k] ?? -1) >= v) return b;
      const nb = { ...b, [k]: v };
      try {
        localStorage.setItem(KEY(s.userId, lang), JSON.stringify(nb));
      } catch {}
      return nb;
    });
    if (!marked.current) {
      marked.current = true;
      s.markDay();
    }
  };

  const sets = data.sets || [{ label: '🔤 Letras', short: 'Letras', letters: data.letters }];
  const letters = sets[typeof view === 'number' ? Math.min(view, sets.length - 1) : 0].letters;
  const canWrite = !!data.sets; // japonês: escrever kana com o dedo
  const wLetters = sets[Math.min(wset, sets.length - 1)].letters.filter((x) => x.l !== 'を' && x.l !== 'ヲ');
  const W = wLetters[wi % wLetters.length];
  // próxima letra para escrever: sorteia, dando preferência às que ainda não têm nota boa
  const nextWrite = () => {
    const weak = wLetters.map((x, i) => [i, best['D:' + x.l] ?? -1] as const).filter(([i, b]) => b < 85 && i !== wi % wLetters.length);
    const pool = weak.length ? weak : wLetters.map((_, i) => [i, 0] as const);
    setWi(pool[Math.floor(Math.random() * pool.length)][0]);
  };
  const L = letters[Math.min(sel, letters.length - 1)];
  const doneOf = (ls: typeof letters) => ls.filter((x) => best['L:' + x.l] != null).length;
  const doneS = data.sounds.filter((x) => x.ex.every(([w]) => best['W:' + w] != null)).length;

  const pick = (i: number) => {
    setSel(i);
    requestAnimationFrame(() => {
      const r = detail.current?.getBoundingClientRect();
      if (r && (r.top < 60 || r.top > window.innerHeight * 0.5))
        detail.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  };

  return (
    <div className="alpha">
      {only == null && mode !== 'write' && (
      <div className="seg">
        {sets.map((st, i) => (
          <button
            key={st.label}
            className={view === i ? 'on' : ''}
            onClick={() => {
              setView(i);
              setSel(0);
            }}
          >
            {st.label}{' '}
            <span className="mut">
              {doneOf(st.letters)}/{st.letters.length}
            </span>
          </button>
        ))}
        <button className={view === 'sounds' ? 'on' : ''} onClick={() => setView('sounds')}>
          {data.sets ? '👄 Sons' : '👄 Sons difíceis'}{' '}
          <span className="mut">
            {doneS}/{data.sounds.length}
          </span>
        </button>
        {canWrite && !noWrite && (
          <button className={view === 'write' ? 'on' : ''} onClick={() => setView('write')}>
            ✍️ Escrever
          </button>
        )}
      </div>
      )}
      {only != null && canWrite && (
        <div className="seg">
          <button className={view !== 'write' ? 'on' : ''} onClick={() => setView(only)}>
            👀 Ver e ouvir
          </button>
          <button className={view === 'write' ? 'on' : ''} onClick={() => setView('write')}>
            ✍️ Escrever de memória
          </button>
        </div>
      )}

      {view === 'write' && W && (
        <div className="card al-detail">
          {only == null && (
            <div className="seg">
              {sets.map((st, i) => (
                <button key={st.label} className={wset === i ? 'on' : ''} onClick={() => (setWset(i), setWi(0))}>
                  {st.label}
                </button>
              ))}
            </div>
          )}
          <KanaWrite
            key={W.l}
            ch={W.l}
            hint={W.ro}
            memory
            best={best['D:' + W.l]}
            onScore={(v) => save('D:' + W.l, v)}
            onNext={nextWrite}
          />
          <p className="mut sh-tip" style={{ textAlign: 'center' }}>
            {wLetters.filter((x) => (best['D:' + x.l] ?? 0) >= 85).length} de {wLetters.length} letras já saem bonitas de memória.
            Travou? Desligue o &quot;De memória&quot; para ver o modelo.
          </p>
        </div>
      )}

      {view === 'write' ? null : view !== 'sounds' ? (
        <>
          <div className="card al-detail" ref={detail} style={{ scrollMarginTop: 120 }}>
            <div className="al-head">
              <span className="al-big">{L.l}</span>
              <div>
                <div className="al-name">
                  {L.ro ? (
                    <>
                      se lê <b>{L.ro}</b>
                    </>
                  ) : (
                    <>
                      se diz <b>{L.say}</b>
                    </>
                  )}
                </div>
                <div className="mut">{L.pt}</div>
              </div>
            </div>
            <SayIt
              key={'L' + lang + L.l}
              text={L.say}
              accept={L.accept}
              best={best['L:' + L.l]}
              onScore={(v) => save('L:' + L.l, v)}
            />
            {canWrite && (
              <div className="al-write">
                <button className="btn ghost sm" onClick={() => setShowWrite((x) => !x)}>
                  {showWrite ? 'Fechar a escrita' : '✍️ Escrever esta letra'}
                  {best['D:' + L.l] != null ? ` · ${best['D:' + L.l]}%` : ''}
                </button>
                {showWrite && <KanaWrite key={'w' + L.l} ch={L.l} hint={L.ro} best={best['D:' + L.l]} onScore={(v) => save('D:' + L.l, v)} />}
              </div>
            )}
            <div className="al-ex">
              <div>
                <span className="mut">Exemplo:</span> <b>{L.ex[0]}</b> <span className="mut">· {L.ex[1]}</span>
              </div>
              <SayIt
                key={'W' + lang + L.ex[0]}
                text={L.ex[0]}
                best={best['W:' + L.ex[0]]}
                onScore={(v) => save('W:' + L.ex[0], v)}
                compact
              />
            </div>
            <div className="row al-nav">
              <button className="btn ghost sm" onClick={() => pick(Math.max(0, sel - 1))} disabled={sel === 0}>
                ← {sel > 0 ? letters[sel - 1].l : ''}
              </button>
              <button
                className="btn sm"
                onClick={() => pick(Math.min(letters.length - 1, sel + 1))}
                disabled={sel === letters.length - 1}
              >
                {sel < letters.length - 1 ? letters[sel + 1].l : ''} →
              </button>
            </div>
          </div>

          <div className={`al-grid ${L.ro ? 'kana' : ''}`} role="group" aria-label="Letras">
            {letters.map((x, i) => (
              <button
                key={x.l}
                className={`al-tile ${i === sel ? 'on' : ''} ${tone(best['L:' + x.l])}`}
                onClick={() => pick(i)}
                aria-label={`${x.l}, se diz ${x.ro || x.say}${best['L:' + x.l] != null ? `, melhor ${best['L:' + x.l]}%` : ''}`}
              >
                <b>{x.l}</b>
                <small>{x.ro || x.say}</small>
              </button>
            ))}
          </div>
          <p className="mut sh-tip">
            Toque numa letra, ouça e repita. A cor mostra sua melhor nota: verde acertou, azul quase, laranja treinar
            mais.
          </p>
        </>
      ) : (
        <>
          <p className="mut" style={{ marginTop: 0 }}>
            Os sons que mais pegam os brasileiros. Travou numa palavra? Procure aqui o pedaço difícil e treine.
          </p>
          {data.sounds.map((x) => (
            <details key={x.id} className="card al-sound">
              <summary>
                <b className="al-st">{x.title}</b>
                <span className="mut al-sp">{x.pt}</span>
                <span className="al-dots" aria-hidden="true">
                  {x.ex.map(([w]) => (
                    <i key={w} className={tone(best['W:' + w])} />
                  ))}
                </span>
              </summary>
              {x.ex.map(([w, pt]) => (
                <div key={w} className="al-word">
                  <div>
                    <b>{w}</b> <span className="mut">· {pt}</span>
                  </div>
                  <SayIt text={w} best={best['W:' + w]} onScore={(v) => save('W:' + w, v)} compact />
                </div>
              ))}
            </details>
          ))}
        </>
      )}
    </div>
  );
}
