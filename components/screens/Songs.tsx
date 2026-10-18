'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { LEVELS, parseDuration, songFit, userLevel } from '@/lib/level';
import LyricsSearch from '../LyricsSearch';

export default function Songs() {
  const s = useStore();
  const { lang, course, progress: p, go, param } = useCourse();
  const level = userLevel(course, p, s.profile.settings.level?.[lang]);
  const mine = s.songs.filter((x) => x.lang === lang && x.user_id === s.userId);
  const family = s.songs.filter((x) => x.lang === lang && x.user_id !== s.userId);

  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [duration, setDuration] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [busy, setBusy] = useState(false);

  // vindo de uma sugestão: abre o formulário já preenchido
  useEffect(() => {
    if (param?.title) {
      setTitle(param.title);
      setArtist(param.artist || '');
      setLyrics('');
      setDuration('');
      setOpen(true);
    }
  }, [param]);

  const q = encodeURIComponent(`${artist} ${title}`.trim());
  const analyze = async () => {
    const lines = lyrics.replace(/\r/g, '').split('\n').map((x) => x.trim());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    if (!title.trim() || !artist.trim()) return alert('Preencha o nome da música e o artista.');
    if (lines.filter(Boolean).length < 4) return alert('Cole a letra (pelo menos 4 linhas).');
    const dur = duration.trim() ? parseDuration(duration) : null;
    if (duration.trim() && !dur) return alert('Duração no formato 3:45 (ou deixe em branco).');
    setBusy(true);
    try {
      const r = await fetch('/api/analyze-song', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang, title: title.trim(), artist: artist.trim(), lines, userLevel: level, duration_sec: dur }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
      const id = await s.addSong(
        lang,
        { title: title.trim(), artist: artist.trim(), duration_sec: dur, level: d.level, analysis: d.analysis },
        lines
      );
      if (!id) throw new Error('Não foi possível salvar a música.');
      setOpen(false);
      setTitle('');
      setArtist('');
      setDuration('');
      setLyrics('');
      go('song', id);
    } catch (e: any) {
      alert(e.message);
    }
    setBusy(false);
  };

  const Row = ({ song }: { song: (typeof s.songs)[number] }) => {
    const f = songFit(song.level, level);
    const studying = (p.songs || []).includes(song.id);
    const owner = s.members.find((m) => m.id === song.user_id)?.name;
    return (
      <button className="wk" onClick={() => go('song', song.id)}>
        <div className="n">{f.emoji}</div>
        <div className="t">
          <div>{song.title}</div>
          <div className="mut">
            {song.artist}
            {owner && song.user_id !== s.userId ? ` · de ${owner}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`lvl l${song.level}`}>{LEVELS[song.level]}</span>
          <div className="mut" style={{ fontSize: 12, marginTop: 4 }}>
            {studying ? `${(p.checks['s:' + song.id] || []).filter(Boolean).length}/7 dias` : 'não iniciada'}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <nav className="crumbs" aria-label="Você está em">
        <button onClick={() => go('weeks', { open: 'fav' })}>Trilha</button>
        <span aria-hidden="true">/</span>
        <button onClick={() => go('weeks', { open: 'fav' })}>Minhas favoritas</button>
      </nav>
      <h2>Adicionar favorita</h2>
      <p className="mut">
        Traga as músicas que você ama: a IA mede o nível, compara com o seu (<b>{LEVELS[level]}</b>) e monta a aula.
      </p>

      {!open ? (
        <button className="btn" onClick={() => setOpen(true)} style={{ marginBottom: 14 }}>
          🎤 Adicionar uma música que eu amo
        </button>
      ) : (
        <div className="card">
          <h3>🎤 Nova música</h3>
          <label>Música</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Baciami ancora" enterKeyHint="next" />
          <label>Artista</label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="ex.: Jovanotti" enterKeyHint="next" />
          {q && (
            <div className="links">
              <a href={`https://www.google.com/search?q=${q}%20${course.meta.lyr}`} target="_blank" rel="noopener">
                📄 Buscar letra
              </a>
              <a href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noopener">
                ▶️ YouTube
              </a>
            </div>
          )}
          <label>Letra</label>
          <LyricsSearch
            title={title}
            artist={artist}
            autoKey={param?.auto && title === param.title ? `${param.title}|${param.artist}` : ''}
            onPick={(t, d) => {
              setLyrics(t);
              if (d && !duration.trim()) setDuration(`${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`);
            }}
          />
          <textarea rows={8} value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="…ou cole a letra aqui" style={{ marginTop: 8 }} />
          <label>Duração (opcional, ajuda a medir a velocidade)</label>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="ex.: 3:45 ou 3.45" inputMode="decimal" enterKeyHint="done" />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn sm" onClick={analyze} disabled={busy}>
              {busy ? 'Analisando… (uns 20 s)' : '✨ Analisar e montar a aula'}
            </button>
            <button className="btn ghost sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
          <p className="mut" style={{ marginBottom: 0 }}>
            Seu nível em {course.meta.name}: <b>{LEVELS[level]}</b>.{' '}
            <a href="#" onClick={(e) => (e.preventDefault(), go('settings'))}>
              Mudar
            </a>
          </p>
        </div>
      )}

      {mine.length ? (
        mine.map((song) => <Row key={song.id} song={song} />)
      ) : (
        <p className="mut" style={{ textAlign: 'center' }}>
          Nenhuma música sua ainda.
        </p>
      )}

      {family.length > 0 && (
        <>
          <h3 style={{ margin: '18px 0 10px', color: 'var(--mut)' }}>Da família</h3>
          {family.map((song) => (
            <Row key={song.id} song={song} />
          ))}
        </>
      )}
    </>
  );
}
