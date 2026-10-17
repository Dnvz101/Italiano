'use client';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { IMM_GOAL, currentWeek, dueList, immDay, immWeek, learnedCount, streak, today } from '@/lib/course';
import { LEVELS, songFit, userLevel } from '@/lib/level';

export default function Home() {
  const s = useStore();
  const { lang, course, progress: p, phrases, songs, go, startReview } = useCourse();
  const { due, fresh } = dueList(course, p, phrases, songs);
  const level = userLevel(course, p, s.profile.settings.level?.[lang]);
  const studying = songs.filter((x) => (p.songs || []).includes(x.id));
  const cur = currentWeek(p);
  const w = course.weeks.find((x) => x.n === cur) || course.weeks[0];
  const done = (p.checks[cur] || []).filter(Boolean).length;
  const n = due.length + Math.min(fresh.length, 10);
  const imToday = immDay(p, today());

  const addImm = (m: number) => {
    const t = today();
    s.updateProgress(lang, (x) => ({ ...x, imm: { ...x.imm, [t]: Math.max(0, (x.imm[t] || 0) + m) } }));
    s.markDay();
  };
  const startWeek = (k: number) => {
    s.updateProgress(lang, (x) => (x.started.includes(k) ? x : { ...x, started: [...x.started, k] }));
    s.markDay();
    go('week', k);
  };

  return (
    <>
      <h2>
        {course.meta.hello}, {s.profile.name}! 👋
      </h2>
      <div className="stats">
        <div className="stat">
          <b>{streak(s.days)}</b>
          <span>{streak(s.days) === 1 ? 'dia seguido' : 'dias seguidos'}</span>
        </div>
        <div className="stat">
          <b>{n}</b>
          <span>cards hoje</span>
        </div>
        <div className="stat">
          <b>{learnedCount(p)}</b>
          <span>firmes na memória</span>
        </div>
      </div>

      <div className="card">
        <div className="mut">
          Semana {cur} · {w.level}
        </div>
        <h3 style={{ marginTop: 4 }}>
          🎵 {w.title} <span className="mut">— {w.artist}</span>
        </h3>
        <div className="prog">
          <i style={{ width: `${(done / 7) * 100}%` }} />
        </div>
        <div className="mut" style={{ marginBottom: 12 }}>
          Roteiro: {done}/7 dias
        </div>
        <button className="btn" onClick={() => go('week', cur)}>
          Continuar semana {cur}
        </button>
      </div>

      <div className="card">
        <h3>🎤 Minhas músicas</h3>
        {studying.length ? (
          studying.slice(0, 3).map((x) => (
            <button key={x.id} className="wk" onClick={() => go('song', x.id)}>
              <div className="n">{songFit(x.level, level).emoji}</div>
              <div className="t">
                <div>{x.title}</div>
                <div className="mut">{x.artist}</div>
              </div>
              <div className="mut" style={{ fontSize: 12 }}>
                {(p.checks['s:' + x.id] || []).filter(Boolean).length}/7 dias
              </div>
            </button>
          ))
        ) : (
          <p className="mut" style={{ marginTop: 0 }}>
            Estude com as músicas que você ama. A IA mede o nível e monta a aula (seu nível: {LEVELS[level]}).
          </p>
        )}
        <button className="btn ghost sm" style={{ width: '100%' }} onClick={() => go('songs')}>
          {songs.length ? 'Ver minhas músicas' : '🎤 Adicionar uma música que eu amo'}
        </button>
      </div>

      <div className="card">
        <h3>🎧 Imersão de hoje</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Séries, podcasts, vídeos ou música de fundo, sem se preocupar em entender tudo. Meta: {IMM_GOAL} min/dia.
        </p>
        <div className="prog">
          <i style={{ width: `${Math.min(100, (imToday / IMM_GOAL) * 100)}%` }} />
        </div>
        <div className="mut" style={{ marginBottom: 10 }}>
          Hoje: <b>{imToday} min</b> · Últimos 7 dias: <b>{Math.round(immWeek(p) / 6) / 10} h</b>
        </div>
        <div className="row">
          {[10, 20, 30].map((m) => (
            <button key={m} className="btn ghost sm" onClick={() => addImm(m)}>
              +{m}
            </button>
          ))}
          <button className="btn ghost sm" onClick={() => addImm(-10)}>
            −10
          </button>
        </div>
        <button className="btn ghost sm" style={{ marginTop: 8, width: '100%' }} onClick={() => go('method')}>
          O que assistir/ouvir?
        </button>
      </div>

      <div className="card">
        <h3>🃏 Revisão de hoje</h3>
        <p className="mut">
          {n
            ? `${due.length} para revisar e ${Math.min(fresh.length, 10)} novos.`
            : 'Tudo em dia! Volte amanhã ou faça uma revisão extra.'}
        </p>
        <button className={`btn ${n ? '' : 'ghost'}`} onClick={() => startReview(!n)}>
          {n ? 'Revisar agora' : 'Revisão extra'}
        </button>
      </div>

      {done === 7 && cur < course.weeks.length && !p.started.includes(cur + 1) && (
        <div className="card">
          <h3>🎉 Semana {cur} completa!</h3>
          <button className="btn" onClick={() => startWeek(cur + 1)}>
            Começar semana {cur + 1}
          </button>
        </div>
      )}
      <p className="mut" style={{ textAlign: 'center' }}>
        Dica: ouvir um pouco todo dia vale mais que muito num dia só.
      </p>
    </>
  );
}
