'use client';
import { useApp, useCourse } from '@/lib/nav';
import { deckQueue, deckStats } from '@/lib/course';
import { deckIds, JDECKS, type Deck } from '@/lib/jdecks';
import type { Course, Progress } from '@/lib/types';

/** Baralhos de kana das semanas de kana que a pessoa já começou. */
export function kanaDecks(course: Course, p: Progress): Deck[] {
  return course.weeks.filter((w) => w.kind === 'kana' && w.deck && p.started.includes(w.n)).map((w) => w.deck as Deck);
}
/** Tem treino de kana pendente hoje? (vira o pontinho na aba Cards e o lembrete no Início) */
export function kanaPending(course: Course | null, p: Progress | null) {
  if (!course || !p || course.lang !== 'ja') return 0;
  return kanaDecks(course, p).reduce((t, d) => t + deckQueue(p, d).length, 0);
}

export function useOpenDeck() {
  const { setSession, go, progress } = useApp();
  return (deck: Deck, extra = false) => {
    if (!progress) return;
    setSession({ queue: deckQueue(progress, deck, extra), done: 0, shown: false, deck });
    go('review');
  };
}

const label = (d: Deck) => JDECKS.find((x) => x.id === d)?.label || d;

/** Lembrete do treino diário no Início (japonês, enquanto o kana não estiver firme). */
export function KanaToday() {
  const { course, progress: p } = useCourse();
  const open = useOpenDeck();
  const decks = kanaDecks(course, p);
  const rows = decks
    .map((d) => ({ d, q: deckQueue(p, d).length, st: deckStats(p, d) }))
    .filter((r) => r.q > 0 || r.st.firm < r.st.total);
  if (!rows.length) return null;
  return (
    <div className="card kana-today">
      <div className="kt-head">
        <span className="kt-ic" aria-hidden="true">
          あ
        </span>
        <span>
          <b>Treino de kana de hoje</b>
          <span className="mut">5 minutinhos por dia fazem o alfabeto grudar.</span>
        </span>
      </div>
      {rows.map(({ d, q, st }) => (
        <div key={d} className="kt-row">
          <span className="kt-t">
            <b>{label(d)}</b>
            <span className="mut">
              {st.firm} de {st.total} firmes{q ? ` · ${q} para hoje` : ' · em dia ✓'}
            </span>
            <span className="prog">
              <i style={{ transform: `scaleX(${Math.max(st.firm / st.total, 0.02)})` }} />
            </span>
          </span>
          <button className={`btn sm ${q ? '' : 'ghost'}`} onClick={() => open(d, !q)}>
            {q ? 'Praticar' : 'Extra'}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Aba "Praticar" das semanas de kana: progresso letra por letra e o botão para os Cards. */
export function KanaDeckPanel({ deck, started }: { deck: Deck; started: boolean }) {
  const { progress: p } = useCourse();
  const open = useOpenDeck();
  const st = deckStats(p, deck);
  const q = deckQueue(p, deck).length;
  const ids = deckIds(deck);
  return (
    <div className="card">
      <h3>{label(deck)} nos Cards</h3>
      <p className="mut" style={{ marginTop: 0 }}>
        Todo dia entram letras novas e voltam as que você errou. Veja a letra, diga o som em voz alta e confira.
      </p>
      <div className="kd-stats">
        <span>
          <b>{st.seen}</b> vistas
        </span>
        <span>
          <b>{st.firm}</b> firmes
        </span>
        <span>
          <b>{st.total}</b> no total
        </span>
      </div>
      <div className="prog">
        <i style={{ transform: `scaleX(${Math.max(st.firm / st.total, 0.02)})` }} />
      </div>
      <div className="kd-grid" aria-label="Suas letras">
        {ids.map((id) => {
          const e = p.srs[id];
          return (
            <span key={id} className={e ? (e.box >= 3 ? 'firm' : 'seen') : ''}>
              {id.slice(3)}
            </span>
          );
        })}
      </div>
      <p className="mut kd-leg">
        <i className="firm" /> firme · <i className="seen" /> aprendendo · <i /> ainda não viu
      </p>
      {started ? (
        <button className="btn" onClick={() => open(deck, !q)}>
          {q ? `▶ Praticar agora (${q})` : 'Treino extra'}
        </button>
      ) : (
        <p className="mut" style={{ marginBottom: 0 }}>
          Comece a semana na aba Roteiro para o baralho entrar na sua rotina.
        </p>
      )}
    </div>
  );
}
