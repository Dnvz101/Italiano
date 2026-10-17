'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { IV, addDays, getCard, gradeLabel, makeQueue, nextBox, today } from '@/lib/course';
import Spk from '../Spk';

export default function Review() {
  const s = useStore();
  const { lang, course, progress: p, phrases, session, setSession, startReview, autoSay, speak, dir } = useCourse();

  useEffect(() => {
    if (!session) setSession({ queue: makeQueue(course, p, phrases, false), done: 0, shown: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const card = session?.queue.length ? getCard(course, phrases, session.queue[0]) : null;
  useEffect(() => {
    // card apagado no meio da sessão: pula
    if (session?.queue.length && !card) setSession({ ...session, queue: session.queue.slice(1) });
  }, [session, card, setSession]);

  if (!session) return null;
  const L = course.meta.name;

  if (!session.queue.length)
    return (
      <>
        <h2>Cards</h2>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h3>{session.done ? `Ótimo! ${session.done} respostas hoje.` : 'Nada para revisar agora.'}</h3>
          <p className="mut">A revisão espaçada traz cada card de volta na hora certa. Volte amanhã.</p>
          <button className="btn ghost" onClick={() => startReview(true)}>
            Revisão extra (20 aleatórios)
          </button>
        </div>
        <div className="card">
          <h3>Direção dos cards</h3>
          <div className="row">
            <button className={`btn ${dir === 'it' ? '' : 'ghost'} sm`} onClick={() => s.setSetting('dir', 'it')}>
              {L} → Português
            </button>
            <button className={`btn ${dir === 'pt' ? '' : 'ghost'} sm`} onClick={() => s.setSetting('dir', 'pt')}>
              Português → {L}
            </button>
          </div>
          <button
            className={`btn ${dir === 'audio' ? '' : 'ghost'} sm`}
            style={{ marginTop: 8, width: '100%' }}
            onClick={() => s.setSetting('dir', 'audio')}
          >
            🎧 Só áudio (sem texto na frente)
          </button>
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
      entry = { box: 0, due: today() };
      q.push(id);
    } else {
      const b = nextBox(g, srs);
      entry = { box: b, due: addDays(today(), IV[b]) };
    }
    s.updateProgress(lang, (x) => ({ ...x, srs: { ...x.srs, [id]: entry } }));
    s.markDay();
    const ns = { queue: q, done: session.done + 1, shown: false };
    setSession(ns);
    autoSay(ns);
  };

  return (
    <>
      <div className="row" style={{ alignItems: 'center', marginBottom: 10 }}>
        <div className="mut">
          {session.queue.length} restantes {!srs && <b style={{ color: 'var(--acc2)' }}>· novo</b>}
        </div>
        <div className="mut" style={{ textAlign: 'right' }}>
          {card.w ? `Semana ${card.w}` : 'Minha frase'}
        </div>
      </div>
      <div className="card flash" onClick={session.shown ? undefined : reveal}>
        <div className="front" style={au ? { fontSize: 20 } : undefined}>
          {front}
        </div>
        {dir !== 'pt' && <Spk text={card.it} />}
        {session.shown ? (
          <>
            <div className="back">{back}</div>
            {dir === 'pt' && <Spk text={card.it} />}
            {card.ex && (
              <div className="ex">
                {card.ex} {card.w && <Spk text={card.ex} />}
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
    </>
  );
}
