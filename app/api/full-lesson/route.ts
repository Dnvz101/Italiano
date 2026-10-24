import { NextResponse } from 'next/server';
import { serverAccess, testerBlocked, testerMsg } from '@/lib/plan-server';
import { LANGS as ALL_LANGS, JA_WRITING } from '@/lib/langs';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaudeJSON, checkQuota, logUsage } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS: Record<string, string> = Object.fromEntries(Object.entries(ALL_LANGS).map(([k, v]) => [k, v.pt]));
const SOUND_HINTS: Record<string, string> = {
  it: 'gli, gn, consoantes dobradas (nonno × nono), c/ch, g/gh, sc/sci, z, o "r" vibrante, vogais abertas e fechadas',
  de: 'ch (ich × ach), ü, ö, ä, ei × ie, o "r" alemão, sch, z, w, consoante final que ensurdece (Tag)',
  en: 'TH (think × this), H aspirado (house, nunca "rouse"), R americano, consoante final sem "i" no fim (big, não "bigui"), -ed (worked × played × wanted), vogal curta × longa (ship × sheep), sílabas fracas e formas reduzidas (gonna, wanna, to = "tâ"), L no fim (people), T e D sem virar "tchi" e "dji"',
  ja: 'つ (tsu), o R japonês (ら・り・る), ふ (fu soprado), vogal longa (おばさん × おばあさん), っ pequeno (きて × きって), ん, vogais que quase somem (です = "dess"), きゃ/しゃ/ちょ',
};
const clip = (s: any, n: number) => String(s ?? '').trim().slice(0, n);
const str = { type: 'string' };
const LESSON_TOOL = {
  name: 'salvar_aula',
  description: 'Salva a aula completa da música (trechos comentados, sons e curiosidades).',
  schema: {
    type: 'object',
    properties: {
      excerpts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            line: str,
            translation: str,
            association: str,
            memorize: str,
            expand: { type: 'array', items: { type: 'array', items: str } },
          },
          required: ['line', 'translation', 'association', 'memorize', 'expand'],
        },
      },
      sounds: {
        type: 'array',
        items: {
          type: 'object',
          properties: { sound: str, how: str, examples: { type: 'array', items: str } },
          required: ['sound', 'how', 'examples'],
        },
      },
      trivia: { type: 'array', items: str },
    },
    required: ['excerpts', 'sounds', 'trivia'],
  },
};
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

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
  if (!lang || !title) return NextResponse.json({ error: 'Informe idioma e música.' }, { status: 400 });
  if (lines.filter((l) => l.trim()).length < 4) return NextResponse.json({ error: 'Cole a letra primeiro.' }, { status: 400 });
  if (lines.length > 200 || lines.join('\n').length > 15000)
    return NextResponse.json({ error: 'Letra grande demais.' }, { status: 413 });

  const L = LANGS[lang];
  const prompt = `Você é um professor de ${L} para brasileiros que dá aulas com música, no estilo dos canais de "aprender ${L} com música".
Monte a aula da música "${title}"${artist ? ` de ${artist}` : ''} usando a técnica A.M.E.:
- Associação: ligar a palavra ou estrutura ao português (parecido, diferente, falso amigo, cognato).
- Memorização: a estrutura ou palavra-chave que vale guardar, e por quê.
- Expansão: frases novas e úteis no dia a dia com a mesma estrutura.

Letra:
${lines.join('\n')}

Entregue a aula chamando a ferramenta salvar_aula, com estes campos:
{
  "excerpts": [
    {
      "line": "um verso da letra, copiado EXATAMENTE como está acima",
      "translation": "tradução natural em português",
      "association": "1 ou 2 frases",
      "memorize": "1 ou 2 frases",
      "expand": [["frase nova em ${L}", "tradução"], ["...", "..."]]
    }
  ],
  "sounds": [
    { "sound": "nome curto do som", "how": "como pronunciar, comparando com sons do português, em 1 ou 2 frases", "examples": ["palavras desta letra com esse som"] }
  ],
  "trivia": ["fato curto sobre a música ou o artista"]
}
Regras:
- "excerpts": 4 a 6 versos que ensinem algo útil, na ordem em que aparecem. Só versos que existem na letra.
- "expand": 2 ou 3 frases por verso, ORIGINAIS, nunca outros versos da música.
- "sounds": 3 ou 4 sons difíceis para brasileiros que aparecem nesta letra (por exemplo: ${SOUND_HINTS[lang]}). Os exemplos devem ser palavras desta letra.
- "trivia": 2 a 4 fatos que você tem CERTEZA que são verdadeiros (ano, contexto, do que fala, regravações conhecidas). Não invente datas, prêmios, números nem histórias. Se não tiver certeza sobre esta música, devolva menos itens ou [].${lang === 'ja' ? `
- Em "line", copie o verso EXATAMENTE como está na letra (sem colchetes). Nas frases de "expand" e nos "examples" de "sounds", use a notação de leitura.
${JA_WRITING}` : ''}`;

  try {
    const acc = await serverAccess(sb, user.id);
    if (acc.tester && (await testerBlocked(sb, user.id, acc.limits.tester_lessons)))
      return NextResponse.json({ error: testerMsg(acc.limits.tester_lessons), code: 'tester' }, { status: 402 });
    await checkQuota(sb, user.id);
    const model = process.env.AI_MODEL_ANALYZE || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
    const { data: a, usage } = await callClaudeJSON<any>(prompt, LESSON_TOOL, 8000, model);
    await logUsage(sb, user.id, 'full-lesson', model, usage);

    // só aceita versos que existem de verdade na letra colada
    const byNorm = new Map(lines.filter((l) => l.trim()).map((l) => [norm(l), l]));
    const excerpts = (Array.isArray(a.excerpts) ? a.excerpts : [])
      .map((e: any) => {
        const real = byNorm.get(norm(String(e?.line || '')));
        if (!real) return null;
        return {
          line: real,
          translation: clip(e.translation, 300),
          association: clip(e.association, 400),
          memorize: clip(e.memorize, 400),
          expand: (Array.isArray(e.expand) ? e.expand : [])
            .filter((x: any) => Array.isArray(x) && x[0])
            .slice(0, 3)
            .map((x: any) => [clip(x[0], 200), clip(x[1], 200)]),
        };
      })
      .filter(Boolean)
      .slice(0, 6);
    if (!excerpts.length) throw new AiError('A IA não conseguiu montar os trechos. Tente de novo.', 502);

    const lesson = {
      excerpts,
      sounds: (Array.isArray(a.sounds) ? a.sounds : [])
        .slice(0, 4)
        .map((x: any) => ({
          sound: clip(x?.sound, 40),
          how: clip(x?.how, 300),
          examples: (Array.isArray(x?.examples) ? x.examples : []).slice(0, 5).map((w: any) => clip(w, 40)).filter(Boolean),
        }))
        .filter((x: any) => x.sound && x.how),
      trivia: (Array.isArray(a.trivia) ? a.trivia : []).slice(0, 4).map((t: any) => clip(t, 300)).filter(Boolean),
      model,
      created_at: new Date().toISOString(),
    };
    return NextResponse.json({ lesson });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao montar a aula.' }, { status });
  }
}
