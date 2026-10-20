'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { IV, addDays, deckQueue, deckStats, getCard, gradeLabel, makeQueue, nextBox, today } from '@/lib/course';
import { JDECKS, type Deck } from '@/lib/jdecks';
import Spk from '../Spk';
import Jt from '../Jt';
import KanaWrite from '../KanaWrite';
import { ro } from '@/lib/kana';

export default function Review() {
  const s = useStore();
  const { lang, course, progress: p, phrases, songs, session, setSession, startReview, autoSay, speak, dir } = useCourse();

  useEffect(() => {
    if (!session) setSession({ queue: makeQueue(course, p, phrases, false, songs), done: 0, shown: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const card = session?.queue.length ? getCard(course, phrases, session.queue[0], songs) : null;
  const [writing, setWriting] = useState(false);
  useEffect(() => setWriting(false), [card?.id]);
  useEffect(() => {
    // card apagado no meio da sessão: pula
    if (session?.queue.length && !card) setSession({ ...session, queue: session.queue.slice(1) });
  }, [session, card, setSession]);

  if (!session) return null;
  const L = course.meta.name;
  const deck = (session.deck || 'main') as Deck;
  const openDeck = (d: Deck, extra = false) =>
    setSession({ queue: d === 'main' ? makeQueue(course, p, phrases, extra, songs) : deckQueue(p, d, extra), done: 0, shown: false, deck: d });
  // japonês: submenu com os baralhos de kana e kanji, cada um com a sua fila
  const decks =
    lang === 'ja' ? (
      <div className="seg deck-tabs" role="tablist" aria-label="Baralhos">
        {JDECKS.map((d) => {
          const due = d.id === 'main' ? null : deckStats(p, d.id).due;
          return (
            <button key={d.id} role="tab" aria-selected={deck === d.id} className={deck === d.id ? 'on' : ''} onClick={() => openDeck(d.id)}>
              {d.label}
              {due ? <span className="deck-due">{due}</span> : null}
            </button>
          );
        })}
      </div>
    ) : null;
  const st = deck !== 'main' ? deckStats(p, deck) : null;
  // direção dos cards: fica à mão embaixo do card (troca na hora, no card atual)
  const setDir = (d: 'it' | 'pt' | 'audio') => {
    s.setSetting('dir', d);
    if (d === 'audio' && card && !session.shown) setTimeout(() => speak(card.it), 120);
  };
  const dirSeg = (
    <div className="seg dir-seg" role="radiogroup" aria-label="Direção dos cards">
      <button role="radio" aria-checked={dir === 'it'} className={dir === 'it' ? 'on' : ''} onClick={() => setDir('it')}>
        {L} → PT
      </button>
      <button role="radio" aria-checked={dir === 'pt'} className={dir === 'pt' ? 'on' : ''} onClick={() => setDir('pt')}>
        PT → {L}
      </button>
      <button role="radio" aria-checked={dir === 'audio'} className={dir === 'audio' ? 'on' : ''} onClick={() => setDir('audio')}>
        🎧 Só áudio
      </button>
    </div>
  );
  // terminou o treino de kana do dia: marca sozinho o próximo dia do roteiro da semana de kana (uma vez por dia)
  const autoCheckKana = (d: Deck) => {
    const w = course.weeks.find((x) => x.kind === 'kana' && x.deck === d);
    if (!w || !p.started.includes(w.n)) return;
    const k = `ascolto-kana-auto:${s.userId}:${d}`;
    try {
      if (localStorage.getItem(k) === today()) return;
      localStorage.setItem(k, today());
    } catch {}
    const ch = [...(p.checks[w.n] || Array(7).fill(false))];
    const i = ch.findIndex((x) => !x);
    if (i < 0) return;
    ch[i] = true;
    s.updateProgress(lang, (x) => ({ ...x, checks: { ...x.checks, [w.n]: ch } }));
  };

  if (!session.queue.length)
    return (
      <>
        <h2>Cards</h2>
        {decks}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h3>{session.done ? `Ótimo! ${session.done} respostas hoje.` : 'Nada para revisar agora.'}</h3>
          <p className="mut">
            {st
              ? `Você já viu ${st.seen} de ${st.total} e ${st.firm} estão firmes. Novas cartas entram todo dia; volte amanhã.`
              : 'A revisão espaçada traz cada card de volta na hora certa. Volte amanhã.'}
          </p>
          <button className="btn ghost" onClick={() => (deck === 'main' ? startReview(true) : openDeck(deck, true))}>
            Revisão extra (20 aleatórios)
          </button>
        </div>
        <div className="card">
          <h3>Direção dos cards</h3>
          {dirSeg}
        </div>
      </>
    );

  if (!card) return null;
  const srs = p.srs[card.id];
  const au = dir === 'audio';
  const front = au ? '🎧 Ouça e tente entender' : dir === 'pt' ? card.pt : card.it;
  const back = dir === 'pt' ? card.it : au ? `${card.it} — ${card.pt}` : card.pt;

  const reveal = () => {
    setSession({ ...session, shown: true });
    if (dir === 'pt') speak(card.it);
  };

  const grade = (g: number) => {
    const id = session.queue[0];
    const q = session.queue.slice(1);
    let entry;
    if (g === 0) {
      entry = { box: 0, due: today(), first: srs?.first || today() };
      q.push(id);
    } else {
      const b = nextBox(g, srs);
      entry = { box: b, due: addDays(today(), IV[b]), first: srs?.first || today() };
    }
    s.updateProgress(lang, (x) => ({ ...x, srs: { ...x.srs, [id]: entry } }));
    s.markDay();
    if (!q.length && (deck === 'kh' || deck === 'kk')) autoCheckKana(deck);
    const ns = { queue: q, done: session.done + 1, shown: false, deck: session.deck };
    setSession(ns);
    autoSay(ns);
  };

  return (
    <>
      {decks}
      <div className="row" style={{ alignItems: 'center', marginBottom: 10 }}>
        <div className="mut">
          {session.queue.length} restantes {!srs && <b style={{ color: 'var(--acc2)' }}>· novo</b>}
        </div>
        <div className="mut" style={{ textAlign: 'right' }}>
          {card.label}
        </div>
      </div>
      <div
        className={`card flash ${session.shown ? 'shown' : ''}`}
        onClick={session.shown ? undefined : reveal}
        role={session.shown ? undefined : 'button'}
        aria-label={session.shown ? undefined : 'Mostrar resposta'}
      >
        <div className={`front ${card.glyph && !au && dir !== 'pt' ? 'glyph' : ''}`} style={au ? { fontSize: 20 } : undefined}>
          <Jt text={front} />
        </div>
        {dir !== 'pt' && <Spk text={card.it} />}
        {session.shown ? (
          <>
            <div className="back">
              {dir === 'pt' ? <Jt text={card.it} ro /> : au ? <><Jt text={card.it} ro /> — {card.pt}</> : back}
            </div>
            {dir === 'it' && !card.glyph && ro(card.it) && <div className="ro back-ro">{ro(card.it)}</div>}
            {card.info && <div className="card-info">{card.info}</div>}
            {card.glyph && (
              <div onClick={(e) => e.stopPropagation()}>
                <button className={`btn sm write-btn ${writing ? 'ghost' : ''}`} onClick={() => setWriting((x) => !x)}>
                  {writing ? '✕ Fechar a escrita' : '✍️ Treinar a escrita'}
                </button>
                {writing && <KanaWrite key={card.id} ch={card.it} />}
              </div>
            )}
            {dir === 'pt' && <Spk text={card.it} />}
            {card.ex && (
              <div className="ex">
                <Jt text={card.ex} ro /> {(card.w || card.glyph) && <Spk text={card.ex} />}
              </div>
            )}
            {card.exPt && <div className="mut">{card.exPt}</div>}
          </>
        ) : (
          <div className="mut" style={{ marginTop: 16 }}>
            Toque para ver a resposta
          </div>
        )}
      </div>
      {session.shown ? (
        <div className="grades">
          <button className="g0" onClick={() => grade(0)}>
            Errei<small>agora</small>
          </button>
          <button onClick={() => grade(1)}>
            Difícil<small>{gradeLabel(1, srs)}</small>
          </button>
          <button onClick={() => grade(2)}>
            Bom<small>{gradeLabel(2, srs)}</small>
          </button>
          <button className="g3" onClick={() => grade(3)}>
            Fácil<small>{gradeLabel(3, srs)}</small>
          </button>
        </div>
      ) : (
        <button className="btn" onClick={reveal}>
          Mostrar resposta
        </button>
      )}
      <div className="dir-foot">
        <span className="mut">Direção dos cards</span>
        {dirSeg}
      </div>
    </>
  );
}
