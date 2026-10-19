'use client';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { currentWeek, roteiro } from '@/lib/course';
import CardList from '../CardList';
import { moduleOfWeek, modules } from '@/lib/modules';
import Lyrics from './Lyrics';
import FullLessonCard from '../FullLessonCard';
import SectionTabs, { useSection } from '../SectionTabs';
import Icon from '../Icon';
import Ic from '../icons';

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
  const [tab, setTab] = useSection(['plan', 'lyrics', 'lesson', 'cards'], 'plan');

  const cur = currentWeek(p);
  const startWeek = () => {
    // evita pular semanas sem querer
    if (
      w.n > cur + 1 &&
      !confirm(`Você está na semana ${cur}. Quer mesmo começar a semana ${w.n}? Ela passa a ser a sua semana atual.`)
    )
      return;
    s.updateProgress(lang, (x) => (x.started.includes(w.n) ? x : { ...x, started: [...x.started, w.n] }));
    s.markDay();
  };
  // começou sem querer: tira a semana da lista (a atual volta a ser a anterior)
  const undoStart = () => {
    const rest = p.started.filter((n) => n !== w.n);
    if (!rest.length) return;
    const back = Math.max(...rest);
    if (!confirm(`Desfazer o início da semana ${w.n}? Sua semana atual volta a ser a ${back}.`)) return;
    s.updateProgress(lang, (x) => {
      const checks = { ...x.checks };
      delete checks[w.n];
      return { ...x, started: x.started.filter((n) => n !== w.n), checks };
    });
    go('week', back);
  };
  const toggleDay = (i: number) => {
    const next = [...(p.checks[w.n] || Array(7).fill(false))];
    next[i] = !next[i];
    s.updateProgress(lang, (x) => ({
      ...x,
      checks: { ...x.checks, [w.n]: next },
    }));
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

      <div className="card song-head with-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-banner" src="/media/banner-semana.webp" alt="" />
        <div className="sh-meta">
          <span className={`lvl lvl-pill l${w.lv}`}>
            <Ic name="bars" size={14} />
            {w.level}
          </span>
          <span className="mut">Semana {w.n}</span>
        </div>
        <h2 className="sh-title">{w.title}</h2>
        <div className="mut">
          {w.artist} · {w.year}
        </div>
        <div className="links compact">
          <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener">
            <Ic name="yt" size={20} /> YouTube
          </a>
          <a href={`https://open.spotify.com/search/${q}`} target="_blank" rel="noopener">
            <Ic name="spotify" size={20} /> Spotify
          </a>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`aprender ${course.meta.lang === 'de' ? 'alemão' : 'italiano'} com música ${w.title} ${w.artist}`)}`}
            target="_blank"
            rel="noopener"
          >
            <Ic name="aula" size={20} /> Aulas
          </a>
        </div>
      </div>

      <SectionTabs
        value={tab}
        onChange={setTab}
        sections={[
          {
            id: 'plan',
            icon: 'roteiro',
            label: 'Roteiro',
            badge: st ? `${ch.filter(Boolean).length}/7` : null,
          },
          { id: 'lyrics', icon: 'letra', label: 'Letra' },
          { id: 'lesson', icon: 'aula', label: 'Aula' },
          { id: 'cards', icon: 'cards', label: 'Cards', badge: w.cards.length },
        ]}
      />

      <div className="stab-body" role="tabpanel" key={tab}>
        {tab === 'plan' && (
          <>
            <div className="card">
              <p style={{ marginTop: 0 }}>{w.about}</p>
              <p className="mut" style={{ marginBottom: 0 }}>
                <b>Por que esta música:</b> {w.why}
              </p>
            </div>
            {st ? (
              <div className="card">
                <h3 className="ih"><Icon name="roteiro" size={28} /> Roteiro da semana</h3>
                {roteiro(course).map((r, i) => (
                  <div
                    key={i}
                    className={`day ${ch[i] ? 'done' : ''}`}
                    onClick={() => toggleDay(i)}
                    role="checkbox"
                    aria-checked={!!ch[i]}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleDay(i))}
                  >
                    <div className="box">{ch[i] ? '✓' : ''}</div>
                    <div className="txt">
                      <b>
                        Dia {i + 1} · {r[0]}
                      </b>
                      <div className="mut">{r[1]}</div>
                    </div>
                  </div>
                ))}
                {p.started.length > 1 && (
                  <button className="link undo-start" onClick={undoStart}>
                    ↩︎ Comecei esta semana sem querer: desfazer
                  </button>
                )}
              </div>
            ) : (
              <div className="card">
                <p style={{ marginTop: 0 }}>
                  Comece a semana para liberar o roteiro e colocar os cards na sua revisão.
                </p>
                <button className="btn" onClick={startWeek}>
                  Começar semana {w.n}
                </button>
              </div>
            )}
            <div className="card">
              <h3 className="ih"><Icon name="cacapalavras" size={28} /> Caça-palavras</h3>
              <p className="mut" style={{ marginTop: 0 }}>
                Palavras para pegar de ouvido nesta música:
              </p>
              {w.hunt.map((h) => (
                <span key={h} className="chip">
                  {h}
                </span>
              ))}
              <p className="mut" style={{ marginBottom: 0 }}>
                Pegou uma frase inteira? Anote na aba <b>Frases</b> com o que entendeu. Ela vira card seu.
              </p>
            </div>
          </>
        )}

        {tab === 'lyrics' && (
          <Lyrics
            key={`${lang}-${w.n}`}
            songKey={'w' + w.n}
            label={`da semana ${w.n}`}
            title={w.title}
            artist={w.artist}
          />
        )}

        {tab === 'lesson' && (
          <>
            <div className="card lesson">
              <h3 className="ih">
                <Icon name="metodo" size={28} /> {w.theme}
              </h3>
              <div dangerouslySetInnerHTML={{ __html: w.lesson }} />
            </div>
            <FullLessonCard key={`fl-${lang}-${w.n}`} songKey={'w' + w.n} title={w.title} artist={w.artist} />
          </>
        )}

        {tab === 'cards' && <CardList title="🗂️ Expressões da semana" cards={w.cards} />}
      </div>

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
