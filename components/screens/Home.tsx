'use client';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { IMM_GOAL, currentWeek, dueList, immDay, immWeek, learnedCount, streak, today } from '@/lib/course';
import { LEVELS, songFit, userLevel, langPt } from '@/lib/level';
import { isComplete, modules } from '@/lib/modules';
import { Eq } from '../Disc';
import Icon from '../Icon';

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
  const all = s.profile.settings.music || {};
  const mp = all[lang];
  const have = new Set(songs.map((x) => x.title.toLowerCase()));
  const forYou = (mp?.sugg?.artists || [])
    .flatMap((a) => a.songs.map((x) => ({ ...x, artist: a.name })))
    .filter((x) => !have.has(x.title.toLowerCase()))
    .sort((a, b) => Math.abs(a.level - level - 0.5) - Math.abs(b.level - level - 0.5))
    .filter((x, i, arr) => arr.findIndex((y) => y.artist === x.artist) === i)
    .slice(0, 3);

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
      {!mp?.sugg && !mp?.skipped && (
        <div className="card invite pop">
          <h3 className="ih"><Icon name="perfil-musical" size={34} /> Que tipo de música você curte?</h3>
          <p style={{ marginTop: 0 }}>
            Conte seus estilos e artistas favoritos (podem ser brasileiros) e o app acha músicas em{' '}
            {langPt(lang)} com a mesma vibe, no seu nível.
          </p>
          <div className="row">
            <button className="btn sm" onClick={() => go('taste')}>
              Montar meu perfil musical
            </button>
            <button
              className="btn ghost sm"
              onClick={() => s.setSetting('music', { ...all, [lang]: { genres: [], artists: [], eras: [], ...mp, skipped: true } })}
            >
              Agora não
            </button>
          </div>
        </div>
      )}

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
        <div className="mut now-label">
          <Eq /> Tocando agora: semana {cur}, {w.level.toLowerCase()}
        </div>
        <h3 style={{ marginTop: 4 }}>
          🎵 {w.title} <span className="mut">— {w.artist}</span>
        </h3>
        <div className="prog">
          <i style={{ transform: `scaleX(${done / 7})` }} />
        </div>
        <div className="mut" style={{ marginBottom: 12 }}>
          Roteiro: {done}/7 dias
        </div>
        <button className="btn" onClick={() => go('week', cur)}>
          Continuar semana {cur}
        </button>
      </div>

      <div className="card shelf">
        <h3>Sua estante</h3>
        {modules(course).map((m, i, all) => {
          const done = m.weeks.filter((w) => isComplete(p, w.n)).length;
          return (
            <button key={m.key} className="shelf-row" onClick={() => go('weeks', { open: m.key })}>
              <span className="shelf-dot" aria-hidden="true" />
              <span className="shelf-t">
                <b>{all.length > 1 ? `Módulo ${i + 1}: ${m.name}` : m.name}</b>
                <span className="disc-bar" aria-hidden="true">
                  <i style={{ transform: `scaleX(${done / m.weeks.length})` }} />
                </span>
              </span>
              <span className="mut">
                {done}/{m.weeks.length}
              </span>
            </button>
          );
        })}
        <button className="shelf-row fav" onClick={() => go('weeks', { open: 'fav' })}>
          <span className="shelf-dot" aria-hidden="true" />
          <span className="shelf-t">
            <b>Minhas favoritas</b>
            <span className="mut">
              {(() => {
                const mine = songs.filter((x) => x.user_id === s.userId);
                const list = studying.length ? studying : mine;
                return list.length
                  ? list.map((x) => `${songFit(x.level, level).emoji} ${x.title}`).join('   ')
                  : `Traga uma música que você ama (seu nível: ${LEVELS[level]})`;
              })()}
            </span>
          </span>
          <span className="mut">{songs.filter((x) => x.user_id === s.userId).length}</span>
        </button>
      </div>

      {forYou.length > 0 && (
        <div className="card">
          <h3 className="ih"><Icon name="perfil-musical" size={28} /> Para você</h3>
          {forYou.map((x) => {
            const f = songFit(x.level, level);
            return (
              <div key={x.artist + x.title} className="tsong">
                <span className="tfit" title={f.title}>
                  {f.emoji}
                </span>
                <div className="t">
                  <b>{x.title}</b>
                  <div className="mut">{x.artist}</div>
                </div>
                <button className="btn sm tstudy" onClick={() => go('songs', { title: x.title, artist: x.artist, auto: true })}>
                  ⭐ Estudar
                </button>
              </div>
            );
          })}
          <button className="link" onClick={() => go('taste')} style={{ marginTop: 6 }}>
            Ver todas as sugestões →
          </button>
        </div>
      )}

      <div className="card">
        <h3 className="ih"><Icon name="imersao" size={28} /> Imersão de hoje</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Séries, podcasts, vídeos ou música de fundo, sem se preocupar em entender tudo. Meta: {IMM_GOAL} min/dia.
        </p>
        <div className="prog">
          <i style={{ transform: `scaleX(${Math.min(1, imToday / IMM_GOAL)})` }} />
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
        <div className="card pop">
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
