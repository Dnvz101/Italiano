// Fornecedor de letras (só no servidor).
// Hoje: LRCLIB (gratuito, comunitário, sem licença das editoras — uso pessoal/família).
// Se o Ascolto virar produto, troque por um fornecedor licenciado (ex.: Musixmatch)
// implementando a mesma função `searchLyrics` e mudando LYRICS_PROVIDER.

export type LyricsResult = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration_sec: number | null;
  synced: boolean; // a fonte tem versão sincronizada (para um futuro modo karaokê)
  text: string; // letra em texto simples, uma linha por verso
};

const UA = 'AscoltoEmFamilia/12 (app privado de estudo de idiomas)';

/** Converte LRC ("[01:23.45] verso") em texto simples */
export function lrcToPlain(lrc: string) {
  return lrc
    .split('\n')
    .map((l) => l.replace(/^(\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+\s*/, '').trimEnd())
    .join('\n')
    .trim();
}

async function lrclib(title: string, artist: string): Promise<LyricsResult[]> {
  const base = process.env.LRCLIB_URL || 'https://lrclib.net';
  const go = async (params: Record<string, string>) => {
    const r = await fetch(`${base}/api/search?${new URLSearchParams(params)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error('Serviço de letras indisponível (' + r.status + ').');
    return (await r.json()) as any[];
  };
  let rows = await go({ track_name: title, artist_name: artist });
  if (!rows.length) rows = await go({ q: `${artist} ${title}` });
  return rows
    .filter((x) => !x.instrumental && (x.plainLyrics || x.syncedLyrics))
    .slice(0, 6)
    .map((x) => ({
      id: String(x.id),
      title: x.trackName || x.name || title,
      artist: x.artistName || artist,
      album: x.albumName || '',
      duration_sec: x.duration ? Math.round(x.duration) : null,
      synced: !!x.syncedLyrics,
      text: (x.plainLyrics || lrcToPlain(x.syncedLyrics || '')).replace(/\r/g, '').trim(),
    }))
    .filter((x) => x.text.split('\n').filter(Boolean).length >= 4);
}

export async function searchLyrics(title: string, artist: string): Promise<LyricsResult[]> {
  const provider = process.env.LYRICS_PROVIDER || 'lrclib';
  if (provider === 'lrclib') return lrclib(title, artist);
  throw new Error(`Fornecedor de letras "${provider}" não implementado.`);
}
