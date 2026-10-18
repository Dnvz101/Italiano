'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { LEVELS, songFit, userLevel, langPt } from '@/lib/level';
import type { MusicProfile } from '@/lib/types';

const GENRES: Record<string, string[]> = {
  it: ['Pop', 'Cantautori (MPB italiana)', 'Rap / Trap', 'Indie', 'Rock', 'Romântica', 'Dançante', 'Eletrônica', 'Acústico'],
  de: ['Pop', 'Deutschrap', 'Indie', 'Rock', 'Punk', 'Liedermacher (voz e violão)', 'Dançante', 'Eletrônica', 'Schlager', 'Neue Deutsche Welle (anos 80)'],
};
const ERAS = ['Clássicos (até 1990)', '1990 a 2010', 'Atuais (2010 em diante)'];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export default function Taste() {
  const s = useStore();
  const { lang, course, progress: p, songs, go } = useCourse();
  const level = userLevel(course, p, s.profile.settings.level?.[lang]);
  const all = s.profile.settings.music || {};
  const mp: MusicProfile = all[lang] || { genres: [], artists: [], eras: [] };

  const [editing, setEditing] = useState(!mp.sugg);
  const [genres, setGenres] = useState<string[]>(mp.genres);
  const [eras, setEras] = useState<string[]>(mp.eras);
  const [artists, setArtists] = useState(mp.artists.join(', '));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = (next: MusicProfile) => s.setSetting('music', { ...all, [lang]: next });
  const flip = (arr: string[], v: string, set: (x: string[]) => void) => {
    setErr('');
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const generate = async () => {
    const art = artists
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!genres.length && !art.length) return setErr('Escolha pelo menos um estilo ou escreva um artista.');
    setBusy(true);
    setErr('');
    try {
      const avoid = [
        ...course.weeks.map((w) => `${w.title} (${w.artist})`),
        ...songs.map((x) => `${x.title} (${x.artist})`),
      ];
      const r = await fetch('/api/music-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang, level, genres, artists: art, eras, avoid }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
      save({
        genres,
        eras,
        artists: art,
        sugg: { summary: d.summary, artists: d.artists, at: new Date().toISOString(), level },
      });
      setEditing(false);
      window.scrollTo(0, 0);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const have = new Set(songs.map((x) => norm(x.title)));

  return (
    <>
      <nav className="crumbs" aria-label="Você está em">
        <button onClick={() => go('home')}>Início</button>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Perfil musical</span>
      </nav>
      <h2>🎧 Perfil musical</h2>

      {editing ? (
        <div className="card">
          <p className="mut" style={{ marginTop: 0 }}>
            Conte o que você gosta de ouvir. O app procura artistas em {langPt(lang)} com a mesma vibe e
            músicas boas para o seu nível ({LEVELS[level]}).
          </p>

          <label>Estilos que você curte</label>
          <div className="pick">
            {(GENRES[lang] || GENRES.it).map((g) => (
              <button
                key={g}
                type="button"
                className={`chip pk ${genres.includes(g) ? 'on' : ''}`}
                aria-pressed={genres.includes(g)}
                onClick={() => flip(genres, g, setGenres)}
              >
                {g}
              </button>
            ))}
          </div>

          <label htmlFor="artists">Artistas que você ama, em qualquer idioma</label>
          <input
            id="artists"
            value={artists}
            onChange={(e) => setArtists(e.target.value)}
            placeholder="ex.: Marisa Monte, Coldplay, Adele"
            autoComplete="off"
          />
          <p className="mut" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Separe por vírgula. Pode ser brasileiro: o app acha quem tem uma vibe parecida em {langPt(lang)}.
          </p>

          <label>Época</label>
          <div className="pick">
            {ERAS.map((g) => (
              <button
                key={g}
                type="button"
                className={`chip pk ${eras.includes(g) ? 'on' : ''}`}
                aria-pressed={eras.includes(g)}
                onClick={() => flip(eras, g, setEras)}
              >
                {g}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={generate} disabled={busy}>
              {busy ? 'Procurando músicas para você…' : '✨ Montar minhas sugestões'}
            </button>
          </div>
          {busy && (
            <p className="mut" style={{ textAlign: 'center' }}>
              Leva uns 20 segundos: o app também confere se cada música existe e tem letra.
            </p>
          )}
          {err && <p className="err">{err}</p>}
          {mp.sugg && !busy && (
            <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setEditing(false)}>
              Voltar às sugestões
            </button>
          )}
        </div>
      ) : (
        mp.sugg && (
          <>
            <div className="card taste-sum">
              <p style={{ marginTop: 0 }}>{mp.sugg.summary}</p>
              <div>
                {[...mp.genres, ...mp.artists].map((g) => (
                  <span key={g} className="chip">
                    {g}
                  </span>
                ))}
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn ghost sm" onClick={() => setEditing(true)}>
                  Mudar meu gosto
                </button>
                <button className="btn ghost sm" onClick={generate} disabled={busy}>
                  {busy ? 'Procurando…' : '🔄 Outras sugestões'}
                </button>
              </div>
              {err && <p className="err">{err}</p>}
            </div>

            <p className="mut">
              🟢 no seu nível · 🔵 mais fácil, ótima para cantar junto · 🟠 desafio. Toque em <b>⭐ Estudar</b> para trazer a
              letra e virar favorita.
            </p>

            {mp.sugg.artists.map((a) => (
              <div key={a.name} className="card artist">
                <h3 style={{ margin: 0 }}>{a.name}</h3>
                <p className="mut" style={{ margin: '4px 0 6px' }}>
                  {a.why}
                </p>
                {a.songs.map((x) => {
                  const f = songFit(x.level, level);
                  const q = encodeURIComponent(`${a.name} ${x.title}`);
                  const got = have.has(norm(x.title));
                  return (
                    <div key={x.title} className="tsong">
                      <span className="tfit" title={f.title}>
                        {f.emoji}
                      </span>
                      <div className="t">
                        <b>{x.title}</b>
                        <div className="mut">
                          {x.year ? `${x.year} · ` : ''}
                          {LEVELS[x.level]} · {x.why}
                        </div>
                      </div>
                      <div className="tact">
                        <a className="spk" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener" aria-label="Ouvir no YouTube">
                          ▶️
                        </a>
                        {got ? (
                          <span className="mut tgot">✓ favorita</span>
                        ) : (
                          <button className="btn sm tstudy" onClick={() => go('songs', { title: x.title, artist: a.name, auto: true })}>
                            ⭐ Estudar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <p className="mut" style={{ textAlign: 'center' }}>
              Sugestões feitas para o nível {LEVELS[mp.sugg.level]}. Quando subir de nível, peça outras.
            </p>
          </>
        )
      )}
    </>
  );
}
