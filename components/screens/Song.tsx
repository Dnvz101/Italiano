'use client';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { roteiro } from '@/lib/course';
import { LEVELS, songFit, userLevel } from '@/lib/level';
import CardList from '../CardList';
import Lyrics from './Lyrics';

export default function SongView() {
  const s = useStore();
  const { lang, course, progress: p, param, go } = useCourse();
  const song = s.songs.find((x) => x.id === param);
  if (!song)
    return (
      <>
        <button className="btn ghost sm" onClick={() => go('songs')}>
          ← Minhas músicas
        </button>
        <p className="mut">Música não encontrada.</p>
      </>
    );

  const a = song.analysis;
  const level = userLevel(course, p, s.profile.settings.level?.[lang]);
  const fit = songFit(song.level, level);
  const studying = (p.songs || []).includes(song.id);
  const ckey = 's:' + song.id;
  const ch = p.checks[ckey] || [];
  const mineSong = song.user_id === s.userId;
  const q = encodeURIComponent(`${song.artist} ${song.title}`);
  const sugg = (a.suggestions || []).filter((x) => x.title.toLowerCase() !== song.title.toLowerCase());
  // sugestões mais úteis primeiro: as do nível do aluno
  sugg.sort((x, y) => Math.abs(x.level - level) - Math.abs(y.level - level));

  const toggleDay = (i: number) => {
    const next = [...(p.checks[ckey] || Array(7).fill(false))];
    next[i] = !next[i];
    s.updateProgress(lang, (x) => ({ ...x, checks: { ...x.checks, [ckey]: next } }));
    if (next[i]) s.markDay();
  };

  return (
    <>
      <button className="btn ghost sm" onClick={() => go('songs')}>
        ← Minhas músicas
      </button>

      <div className="card" style={{ marginTop: 12 }}>
        <span className={`lvl l${song.level}`}>{LEVELS[song.level]}</span>
        <h3 style={{ marginTop: 10, fontSize: 20 }}>🎤 {song.title}</h3>
        <div className="mut">{song.artist}</div>
        {a.about && <p>{a.about}</p>}
        {a.why && (
          <p className="mut">
            <b>O que ela treina:</b> {a.why}
          </p>
        )}
        <div className="links">
          <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener">
            ▶️ YouTube
          </a>
          <a href={`https://open.spotify.com/search/${q}`} target="_blank" rel="noopener">
            🎧 Spotify
          </a>
        </div>
      </div>

      <div className={`card fit fit-${fit.kind}`}>
        <h3>
          {fit.emoji} {fit.title}
        </h3>
        <p style={{ marginTop: 0 }}>{fit.text}</p>
        <p className="mut" style={{ marginBottom: 0 }}>
          Música: <b>{LEVELS[song.level]}</b> · Você: <b>{LEVELS[level]}</b>
          {a.level_reason && <> · {a.level_reason}</>}
        </p>
        {a.signals && (
          <div style={{ marginTop: 8 }}>
            {a.signals.speed && <span className="chip">⏱ {a.signals.speed}</span>}
            {a.signals.wpm ? <span className="chip">{a.signals.wpm} palavras/min</span> : null}
            {a.signals.vocab && <span className="chip">📚 vocabulário {a.signals.vocab}</span>}
            {a.signals.slang && a.signals.slang !== 'nenhuma' && <span className="chip">💬 gíria: {a.signals.slang}</span>}
            {(a.signals.grammar || []).map((g) => (
              <span key={g} className="chip">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {sugg.length > 0 && (
        <div className="card">
          <h3>{fit.kind === 'easy' || fit.kind === 'hard' ? `Que tal esta de ${song.artist}?` : `Mais de ${song.artist}`}</h3>
          {sugg.map((x) => {
            const sq = encodeURIComponent(`${x.artist} ${x.title}`);
            const f = songFit(x.level, level);
            return (
              <div key={x.title} className="vc">
                <div style={{ fontSize: 20 }}>{f.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div className="it">{x.title}</div>
                  <div className="mut">
                    {LEVELS[x.level]} · {x.reason}
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <a className="btn ghost sm" href={`https://www.youtube.com/results?search_query=${sq}`} target="_blank" rel="noopener">
                      ▶️ Ouvir
                    </a>
                    <button className="btn ghost sm" onClick={() => go('songs', { title: x.title, artist: x.artist })}>
                      + Adicionar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="mut" style={{ marginBottom: 0 }}>
            Sugestões da IA: confira no YouTube se a música existe antes de colar a letra.
          </p>
        </div>
      )}

      {a.hunt?.length > 0 && (
        <div className="card">
          <h3>🔎 Caça-palavras</h3>
          {a.hunt.map((h) => (
            <span key={h} className="chip">
              {h}
            </span>
          ))}
        </div>
      )}

      <Lyrics key={song.id} songKey={'song:' + song.id} label={`de ${song.title}`} chorusDefault={fit.kind === 'hard'} />

      {a.lesson && (
        <div className="card lesson">
          <h3>💡 {a.theme}</h3>
          <div dangerouslySetInnerHTML={{ __html: a.lesson }} />
        </div>
      )}

      {studying ? (
        <div className="card">
          <h3>📅 Roteiro de 7 dias</h3>
          {roteiro(course).map((r, i) => (
            <div key={i} className={`day ${ch[i] ? 'done' : ''}`} onClick={() => toggleDay(i)}>
              <div className="box">{ch[i] ? '✓' : ''}</div>
              <div className="txt">
                <b>
                  Dia {i + 1} · {r[0]}
                </b>
                <div className="mut">{r[1]}</div>
              </div>
            </div>
          ))}
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => s.toggleSongStudy(lang, song.id)}>
            Parar de estudar (tira os cards da revisão)
          </button>
        </div>
      ) : (
        <div className="card">
          <p>Comece para liberar o roteiro de 7 dias e colocar os {a.cards.length} cards na sua revisão.</p>
          <button className="btn" onClick={() => s.toggleSongStudy(lang, song.id)}>
            Começar a estudar esta música
          </button>
        </div>
      )}

      <CardList title="🗂️ Expressões desta música" cards={a.cards} />

      {mineSong && (
        <button
          className="btn ghost sm"
          style={{ color: 'var(--bad)' }}
          onClick={async () => {
            if (!confirm('Apagar esta música, a letra e os cards dela?')) return;
            await s.deleteSong(song.id);
            go('songs');
          }}
        >
          Apagar música
        </button>
      )}
    </>
  );
}
