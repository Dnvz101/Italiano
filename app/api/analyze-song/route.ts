import { NextResponse } from 'next/server';
import { serverAccess, testerAsk, testerBlocked, testerMsg } from '@/lib/plan-server';
import { LANGS as ALL_LANGS, JA_WRITING } from '@/lib/langs';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaudeJSON, checkQuota, logUsage } from '@/lib/ai';
import bundledIt from '@/content/it.json';
import bundledDe from '@/content/de.json';
import bundledJa from '@/content/ja.json';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS: Record<string, string> = Object.fromEntries(Object.entries(ALL_LANGS).map(([k, v]) => [k, v.pt]));
const COURSES: Record<string, any> = { it: bundledIt, de: bundledDe, ja: bundledJa };
const LEVEL_NAMES = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado'];

const clip = (s: any, n: number) => String(s ?? '').trim().slice(0, n);
const str = { type: 'string' };
const ANALYSIS_TOOL = {
  name: 'salvar_analise',
  description: 'Salva a análise de nível e a aula da música.',
  schema: {
    type: 'object',
    properties: {
      level: { type: 'integer', minimum: 1, maximum: 4 },
      level_reason: str,
      signals: {
        type: 'object',
        properties: { speed: str, vocab: str, grammar: { type: 'array', items: str }, slang: str },
        required: ['speed', 'vocab', 'grammar', 'slang'],
      },
      theme: str,
      about: str,
      why: str,
      hunt: { type: 'array', items: str },
      lesson: str,
      cards: { type: 'array', items: { type: 'array', items: str } },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: str, artist: str, level: { type: 'integer' }, reason: str },
          required: ['title', 'artist', 'level', 'reason'],
        },
      },
    },
    required: ['level', 'level_reason', 'signals', 'theme', 'about', 'why', 'hunt', 'lesson', 'cards', 'suggestions'],
  },
};
const sanitize = (html: string) =>
  clip(html, 4000)
    .replace(/<(?!\/?(p|b|i|br)\s*\/?>)[^>]*>/gi, '')
    .replace(/javascript:/gi, '');

function anchors(lang: string) {
  const weeks: any[] = (COURSES[lang]?.weeks || []).filter((w: any) => w.kind !== 'kana');
  return [1, 2, 3, 4]
    .map((lv) => {
      const ws = weeks.filter((w) => w.lv === lv).slice(0, 2);
      return ws.length ? `- Nível ${lv} (${LEVEL_NAMES[lv]}): ${ws.map((w) => `"${w.title}" de ${w.artist}`).join(', ')}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo para usar a IA.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lang = LANGS[body?.lang] ? body.lang : null;
  const title = clip(body?.title, 120);
  const artist = clip(body?.artist, 120);
  const lines: string[] = Array.isArray(body?.lines) ? body.lines.map((l: any) => clip(l, 300)) : [];
  const userLevel = Math.min(4, Math.max(1, Number(body?.userLevel) || 1));
  const duration = Number(body?.duration_sec) || null;

  if (!lang || !title || !artist) return NextResponse.json({ error: 'Informe idioma, título e artista.' }, { status: 400 });
  const filled = lines.filter((l) => l.trim());
  if (filled.length < 4) return NextResponse.json({ error: 'Cole a letra (pelo menos 4 linhas).' }, { status: 400 });
  if (lines.length > 200 || lines.join('\n').length > 15000)
    return NextResponse.json({ error: 'Letra grande demais.' }, { status: 413 });

  // japonês não separa palavras: conta sílabas (caracteres) por minuto
  const ja = lang === 'ja';
  const words = ja
    ? filled.join('').replace(/[\s\p{P}]/gu, '').length
    : filled.join(' ').split(/\s+/).filter(Boolean).length;
  const wpm = duration ? Math.round(words / (duration / 60)) : null;
  const target = LEVEL_NAMES[userLevel];

  const prompt = `Você é um professor de ${LANGS[lang]} para brasileiros que usa o método natural de Stephen Krashen (input compreensível, aprender com música).
Um aluno de nível ${userLevel} (${target}) quer estudar a música abaixo. Analise-a.

Escala de níveis (calibre pelas músicas de referência do nosso curso):
1 Iniciante: ritmo lento, dicção clara, vocabulário básico, quase tudo no presente, frases curtas e repetidas.
2 Básico: ritmo moderado, vocabulário do cotidiano, passado simples, poucas expressões idiomáticas.
3 Intermediário: ritmo normal a rápido, vários tempos verbais, expressões idiomáticas, sentimentos complexos.
4 Avançado: muito rápida ou rap, subjuntivo/condicional frequentes, gírias, dialeto, metáforas densas.
Referências:
${anchors(lang)}

Dados objetivos: ${words} ${ja ? 'caracteres' : 'palavras'}${wpm ? `, cerca de ${wpm} ${ja ? 'caracteres (sílabas)' : 'palavras'} por minuto (duração informada pelo aluno)` : ''}.

Música: "${title}" — ${artist}
Letra:
${lines.join('\n')}

Entregue a análise chamando a ferramenta salvar_analise, com estes campos:
{
  "level": 1 a 4,
  "level_reason": "1 ou 2 frases em português explicando o nível (ritmo, vocabulário, tempos verbais)",
  "signals": { "speed": "lenta|moderada|rápida|muito rápida", "vocab": "básico|cotidiano|variado|rico", "grammar": ["tempos/estruturas principais"], "slang": "nenhuma|pouca|muita" },
  "theme": "a estrutura gramatical ou tema de vocabulário mais útil desta música (curto)",
  "about": "do que a música fala, em 1-2 frases, sem citar versos",
  "why": "o que ela treina no ouvido e na fala, em 1 frase",
  "hunt": ["5 a 8 palavras curtas da letra para caçar de ouvido"],
  "lesson": "2 ou 3 parágrafos curtos em HTML usando só <p>, <b> e <i>, explicando o tema com exemplos ORIGINAIS (não copie versos)",
  "cards": [["expressão curta da letra (no máximo 5 palavras)", "significado em português", "frase de exemplo ORIGINAL e útil no dia a dia, em ${LANGS[lang]}", "tradução do exemplo"]],
  "suggestions": [{ "title": "...", "artist": "${artist}", "level": 1 a 4, "reason": "por que serve, em 1 frase" }]
}
Regras:
- "cards": 8 a 10 itens, priorizando expressões que o aluno vai usar na vida real.
- Nunca reproduza versos inteiros fora do campo "hunt" e da expressão curta dos cards.
- "suggestions": até 3 músicas REAIS e conhecidas do mesmo artista (${artist}), de preferência do nível ${userLevel}. Só sugira músicas que você tem certeza que existem; se não tiver certeza, devolva [].${ja ? `
- Em "hunt", copie as palavras como estão na letra (sem colchetes). Nos cards (expressão e exemplo) e na "lesson", use a notação de leitura.
${JA_WRITING}` : ''}`;

  try {
    const acc = await serverAccess(sb, user.id);
    if (acc.tester && (await testerBlocked(sb, user.id, acc.limits.tester_lessons)))
      return NextResponse.json({ error: testerMsg(acc.limits.tester_lessons), code: 'tester' }, { status: 402 });
    if (acc.tester) {
      const { count } = await sb.from('user_songs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count || 0) >= acc.limits.tester_songs)
        return NextResponse.json(
          { error: `Na conta de teste cabem ${acc.limits.tester_songs} músicas suas. ${testerAsk}`, code: 'tester' },
          { status: 402 }
        );
    }
    if (acc.free) {
      const { count } = await sb.from('user_songs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count || 0) >= acc.limits.own_songs)
        return NextResponse.json(
          { error: `No plano grátis cabem ${acc.limits.own_songs} músicas suas. ${acc.limits.support_text}`, code: 'limit', support_url: acc.limits.support_url },
          { status: 402 }
        );
    }
    await checkQuota(sb, user.id);
    const model = process.env.AI_MODEL_ANALYZE || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
    const { data: a, usage } = await callClaudeJSON<any>(prompt, ANALYSIS_TOOL, 8000, model);
    await logUsage(sb, user.id, 'analyze-song', model, usage);

    const level = Math.min(4, Math.max(1, Math.round(Number(a.level)) || 2));
    const cards = (Array.isArray(a.cards) ? a.cards : [])
      .filter((c: any) => Array.isArray(c) && c.length >= 2)
      .slice(0, 12)
      .map((c: any) => [clip(c[0], 80), clip(c[1], 120), clip(c[2], 200), clip(c[3], 200)]);
    if (!cards.length) throw new AiError('A IA não conseguiu montar os cards. Tente de novo.', 502);

    const analysis = {
      level_reason: clip(a.level_reason, 400),
      signals: {
        speed: clip(a.signals?.speed, 30),
        vocab: clip(a.signals?.vocab, 30),
        grammar: (Array.isArray(a.signals?.grammar) ? a.signals.grammar : []).slice(0, 6).map((g: any) => clip(g, 40)),
        slang: clip(a.signals?.slang, 30),
        wpm,
      },
      theme: clip(a.theme, 120),
      about: clip(a.about, 400),
      why: clip(a.why, 300),
      hunt: (Array.isArray(a.hunt) ? a.hunt : []).slice(0, 10).map((h: any) => clip(h, 40)).filter(Boolean),
      lesson: sanitize(a.lesson || ''),
      cards,
      suggestions: (Array.isArray(a.suggestions) ? a.suggestions : []).slice(0, 3).map((s: any) => ({
        title: clip(s.title, 120),
        artist: clip(s.artist || artist, 120),
        level: Math.min(4, Math.max(1, Math.round(Number(s.level)) || level)),
        reason: clip(s.reason, 200),
      })).filter((s: any) => s.title),
    };
    return NextResponse.json({ level, analysis });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao analisar.' }, { status });
  }
}
