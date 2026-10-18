'use client';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { roteiro } from '@/lib/course';
import CardList from '../CardList';
import { moduleOfWeek, modules } from '@/lib/modules';
import Lyrics from './Lyrics';

export default function WeekView() {
  const s = useStore();
  const { lang, course, progress: p, param, go } = useCourse();
  const w = course.weeks.find((x) => x.n === param) || course.weeks[0];
  const st = p.started.includes(w.n);
  const ch = p.checks[w.n] || [];
  const q = encodeURIComponent(`${w.artist} ${w.title}`);
  const mods = modules(course);
  const mod = moduleOfWeek(course, w.n);
  const modIdx = mods.findIndex((m) => m.key === mod?.key);
  const idx = course.weeks.findIndex((x) => x.n === w.n);
  const prev = course.weeks[idx - 1];
  const next = course.weeks[idx + 1];

  const startWeek = () => {
    s.updateProgress(lang, (x) => (x.started.includes(w.n) ? x : { ...x, started: [...x.started, w.n] }));
    s.markDay();
  };
  const toggleDay = (i: number) => {
    const next = [...(p.checks[w.n] || Array(7).fill(false))];
    next[i] = !next[i];
    s.updateProgress(lang, (x) => ({ ...x, checks: { ...x.checks, [w.n]: next } }));
    if (next[i]) s.markDay();
  };

  return (
    <>
      <nav className="crumbs" aria-label="Você está em">
        <button onClick={() => go('weeks', { open: mod?.key })}>Trilha</button>
        {mods.length > 1 && (
          <>
            <span aria-hidden="true">/</span>
            <button onClick={() => go('weeks', { open: mod?.key })}>Módulo {modIdx + 1}</button>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">Semana {w.n}</span>
      </nav>
      <h2>Semana {w.n}</h2>

      <div className="card">
        <span className={`lvl l${w.lv}`}>{w.level}</span>
        <h3 style={{ marginTop: 10, fontSize: 20 }}>🎵 {w.title}</h3>
        <div className="mut">
          {w.artist} · {w.year}
        </div>
        <p>{w.about}</p>
        <p className="mut">
          <b>Por que esta música:</b> {w.why}
        </p>
        <div className="links">
          <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener">
            ▶️ YouTube
          </a>
          <a href={`https://open.spotify.com/search/${q}`} target="_blank" rel="noopener">
            🎧 Spotify
          </a>
          <a href={`https://www.google.com/search?q=${q}%20${course.meta.lyr}`} target="_blank" rel="noopener">
            📄 Letra
          </a>
        </div>
      </div>

      <div className="card">
        <h3>🔎 Caça-palavras</h3>
        <p className="mut">Palavras para pegar de ouvido nesta música:</p>
        {w.hunt.map((h) => (
          <span key={h} className="chip">
            {h}
          </span>
        ))}
        <p className="mut" style={{ marginBottom: 0 }}>
          Pegou uma frase inteira? Anote na aba <b>Frases</b> com o que entendeu. Ela vira card seu.
        </p>
      </div>

      <Lyrics key={`${lang}-${w.n}`} songKey={'w' + w.n} label={`da semana ${w.n}`} title={w.title} artist={w.artist} />

      <div className="card lesson">
        <h3>💡 {w.theme}</h3>
        <div dangerouslySetInnerHTML={{ __html: w.lesson }} />
      </div>

      {st ? (
        <div className="card">
          <h3>📅 Roteiro da semana</h3>
          {roteiro(course).map((r, i) => (
            <div key={i} className={`day ${ch[i] ? 'done' : ''}`} onClick={() => toggleDay(i)} role="checkbox" aria-checked={!!ch[i]} tabIndex={0} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleDay(i))}>
              <div className="box">{ch[i] ? '✓' : ''}</div>
              <div className="txt">
                <b>
                  Dia {i + 1} · {r[0]}
                </b>
                <div className="mut">{r[1]}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p>Comece a semana para liberar o roteiro e colocar os cards na sua revisão.</p>
          <button className="btn" onClick={startWeek}>
            Começar semana {w.n}
          </button>
        </div>
      )}

      <CardList title="🗂️ Expressões da semana" cards={w.cards} />

      <div className="pager">
        {prev ? (
          <button className="pager-btn" onClick={() => go('week', prev.n)}>
            <span className="mut">Semana {prev.n}</span>
            <b>← {prev.title}</b>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button className="pager-btn next" onClick={() => go('week', next.n)}>
            <span className="mut">Semana {next.n}</span>
            <b>{next.title} →</b>
          </button>
        )}
      </div>
    </>
  );
}
