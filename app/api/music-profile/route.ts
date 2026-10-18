import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaudeJSON, checkQuota, logUsage } from '@/lib/ai';
import { searchLyrics } from '@/lib/lyrics-provider';
import bundledIt from '@/content/it.json';
import bundledDe from '@/content/de.json';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS: Record<string, string> = { it: 'italiano', de: 'alemão' };
const COURSES: Record<string, any> = { it: bundledIt, de: bundledDe };
const LEVEL_NAMES = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado'];
const clip = (s: any, n: number) => String(s ?? '').trim().slice(0, n);
const list = (v: any, n: number, len = 80) =>
  (Array.isArray(v) ? v : []).map((x) => clip(x, len)).filter(Boolean).slice(0, n);
const str = { type: 'string' };

const TOOL = {
  name: 'salvar_sugestoes',
  description: 'Salva as sugestões de artistas e músicas a partir do perfil musical.',
  schema: {
    type: 'object',
    properties: {
      summary: { ...str, description: 'Uma frase em português resumindo o gosto da pessoa' },
      artists: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: str,
            why: { ...str, description: 'Por que combina com o gosto dela (1 frase, português)' },
            songs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: str,
                  year: { type: 'integer' },
                  level: { type: 'integer', minimum: 1, maximum: 4 },
                  why: { ...str, description: 'Por que é boa para estudar (1 frase curta, português)' },
                },
                required: ['title', 'level', 'why'],
              },
            },
          },
          required: ['name', 'why', 'songs'],
        },
      },
    },
    required: ['summary', 'artists'],
  },
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Confere na base de letras se a música existe de verdade (a IA às vezes inventa títulos). */
async function verify(title: string, artist: string): Promise<boolean | null> {
  try {
    const rs = await searchLyrics(title, artist);
    const a = norm(artist);
    return rs.some((r) => {
      const ra = norm(r.artist);
      return ra && (ra.includes(a) || a.includes(ra));
    });
  } catch {
    return null; // serviço fora do ar: não dá para saber
  }
}

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lang = LANGS[body?.lang] ? body.lang : null;
  if (!lang) return NextResponse.json({ error: 'Idioma inválido.' }, { status: 400 });
  const level = Math.min(4, Math.max(1, Number(body?.level) || 1));
  const genres = list(body?.genres, 12, 40);
  const artists = list(body?.artists, 12, 60);
  const eras = list(body?.eras, 4, 40);
  const avoid = list(body?.avoid, 60, 120);
  if (!genres.length && !artists.length)
    return NextResponse.json({ error: 'Escolha pelo menos um estilo ou um artista.' }, { status: 400 });

  const L = LANGS[lang];
  const weeks: any[] = COURSES[lang]?.weeks || [];
  const anchors = [1, 2, 3, 4]
    .map((lv) => {
      const ws = weeks.filter((w) => w.lv === lv).slice(0, 2);
      return ws.length ? `- Nível ${lv} (${LEVEL_NAMES[lv]}): ${ws.map((w) => `"${w.title}" de ${w.artist}`).join(', ')}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `PERFIL MUSICAL. Você é um curador musical e professor de ${L} para brasileiros que aprendem pelo método natural (Krashen): uma música por semana, ouvida muitas vezes.
A pessoa está no nível ${level} (${LEVEL_NAMES[level]}) de 4.

O que ela gosta:
- Estilos: ${genres.join(', ') || '(não disse)'}
- Artistas que ela ama (em qualquer idioma): ${artists.join(', ') || '(não disse)'}
- Épocas: ${eras.join(', ') || 'qualquer'}

Régua de nível (músicas da trilha do app):
${anchors}

Tarefa: sugira 6 artistas que cantam em ${L} e que combinam com esse gosto (se ela citou artistas de outros idiomas, ache equivalentes em ${L}: mesma vibe, voz, estilo). Para cada artista, 2 músicas reais e conhecidas, boas para estudar.
Regras:
- Só músicas que você tem CERTEZA que existem, com o título exato como aparece nas plataformas. Na dúvida, não inclua.
- Priorize músicas no nível dela ou um pouco acima (i+1): ritmo não muito rápido, refrão que se repete, pronúncia clara. Indique o nível de cada uma (1 a 4) pela régua.
- Varie: não repita o mesmo artista. Não sugira estas, que ela já tem: ${avoid.join('; ') || '(nenhuma)'}.
- "why" sempre em português, curto e concreto.
Entregue chamando a ferramenta salvar_sugestoes.`;

  try {
    await checkQuota(sb, user.id);
    const model = process.env.AI_MODEL_ANALYZE || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
    const { data, usage } = await callClaudeJSON<any>(prompt, TOOL, 4000, model);
    await logUsage(sb, user.id, 'music-profile', model, usage);

    // junta repetidos e limpa
    const byName = new Map<string, { name: string; why: string; songs: any[] }>();
    for (const a of Array.isArray(data?.artists) ? data.artists : []) {
      const name = clip(a?.name, 80);
      if (!name) continue;
      const k = norm(name);
      const cur = byName.get(k) || { name, why: clip(a?.why, 200), songs: [] };
      for (const s of Array.isArray(a?.songs) ? a.songs : []) {
        const title = clip(s?.title, 120);
        if (!title || cur.songs.some((x) => norm(x.title) === norm(title))) continue;
        cur.songs.push({
          title,
          year: Number(s?.year) || null,
          level: Math.min(4, Math.max(1, Number(s?.level) || level)),
          why: clip(s?.why, 200),
        });
      }
      byName.set(k, cur);
    }
    const out = [...byName.values()].slice(0, 8).map((a) => ({ ...a, songs: a.songs.slice(0, 3) }));

    // confere cada música na base de letras, em paralelo
    const checks = await Promise.all(out.flatMap((a) => a.songs.map((s) => verify(s.title, a.name))));
    const serviceDown = checks.every((c) => c === null);
    let k = 0;
    const artistsOut = out
      .map((a) => ({
        ...a,
        songs: a.songs
          .map((s) => ({ ...s, found: checks[k++] === true }))
          .filter((s) => serviceDown || s.found),
      }))
      .filter((a) => a.songs.length);

    if (!artistsOut.length) throw new AiError('Não consegui montar sugestões confiáveis. Tente outros estilos ou artistas.', 502);
    return NextResponse.json({ summary: clip(data?.summary, 300), artists: artistsOut, verified: !serviceDown });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao montar as sugestões.' }, { status });
  }
}
