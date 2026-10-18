'use client';
import { useState } from 'react';
import type { LyricsResult } from '@/lib/lyrics-provider';

const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');

/** Busca a letra pelo servidor e devolve a versão escolhida. Não salva sozinho: a pessoa confere antes. */
export default function LyricsSearch({
  title,
  artist,
  onPick,
}: {
  title: string;
  artist: string;
  onPick: (text: string, durationSec: number | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<LyricsResult[] | null>(null);
  const [msg, setMsg] = useState('');

  const search = async () => {
    if (!title.trim() || !artist.trim()) {
      setMsg('Preencha a música e o artista primeiro.');
      return;
    }
    setBusy(true);
    setMsg('');
    setResults(null);
    try {
      const r = await fetch(`/api/lyrics/search?${new URLSearchParams({ title: title.trim(), artist: artist.trim() })}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
      setResults(d.results);
      if (!d.results.length) setMsg('Não encontrei essa letra. Confira a grafia ou cole manualmente.');
      if (d.results.length === 1) pick(d.results[0]);
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy(false);
  };

  const pick = (x: LyricsResult) => {
    onPick(x.text, x.duration_sec);
    setResults(null);
    setMsg(`Letra de "${x.title}" colocada abaixo. Confira e salve.`);
  };

  return (
    <div className="lsearch">
      <button type="button" className="btn ghost sm" onClick={search} disabled={busy}>
        {busy ? 'Buscando…' : '🔎 Buscar letra automaticamente'}
      </button>
      {results && results.length > 1 && (
        <div className="lresults">
          <p className="mut" style={{ margin: '8px 0 4px' }}>
            Encontrei {results.length} versões. Qual é a certa?
          </p>
          {results.map((x) => (
            <button key={x.id} type="button" className="wk" onClick={() => pick(x)}>
              <div className="t">
                <div>{x.title}</div>
                <div className="mut">
                  {x.artist}
                  {x.album ? ` · ${x.album}` : ''}
                </div>
              </div>
              <div className="mut" style={{ fontSize: 12, textAlign: 'right' }}>
                {fmt(x.duration_sec)}
                <br />
                {x.text.split('\n').filter(Boolean).length} linhas
              </div>
            </button>
          ))}
        </div>
      )}
      {msg && (
        <p className="mut" style={{ margin: '8px 0 0' }} role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
