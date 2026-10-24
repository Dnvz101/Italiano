import { NextResponse } from 'next/server';
import { LANGS as ALL_LANGS } from '@/lib/langs';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaudeJSON, checkQuota, logUsage } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS: Record<string, string> = Object.fromEntries(Object.entries(ALL_LANGS).map(([k, v]) => [k, v.pt]));
const MAX_LINES = 150;
const MAX_CHARS = 12000;

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo para usar a IA.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lines: string[] | null = Array.isArray(body?.lines) ? body.lines.map((l: any) => String(l ?? '')) : null;
  const from = LANGS[body?.from] ? body.from : 'it';
  if (!lines?.length) return NextResponse.json({ error: 'Envie { lines: [...] }.' }, { status: 400 });
  if (lines.length > MAX_LINES || lines.join('\n').length > MAX_CHARS)
    return NextResponse.json({ error: 'Letra grande demais.' }, { status: 413 });

  try {
    await checkQuota(sb, user.id);
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
    const isJa = from === 'ja';

    // Só as linhas diferentes (refrão repetido vai uma vez): menos texto, mais rápido e mais barato.
    const uniq = Array.from(new Set(lines.map((l) => l.trim()).filter(Boolean)));
    const tr = new Map<string, string>();
    const rd = new Map<string, string>();

    const ask = async (part: string[]) => {
      const numbered = part.map((l, i) => `${i + 1}. ${l}`).join('\n');
      const prompt = `Você é um professor de ${LANGS[from]} para brasileiros. O aluno colou estas linhas (de uma música que ele está estudando) e precisa entender cada uma.
Traduza cada linha para o português do Brasil.
Regras:
- Responda só com a tradução em português; não repita o texto original.
- Tradução natural, como um brasileiro diria, mas fiel ao sentido. Se houver gíria ou expressão idiomática, traduza o sentido.
${isJa ? `- Em "readings", dê a leitura de cada linha SÓ em hiragana (katakana e kanji viram hiragana), com espaço entre as palavras, como num livro infantil. Mesma quantidade de itens.\n` : ''}- Mantenha exatamente ${part.length} itens, na mesma ordem.
- Entregue chamando a ferramenta salvar_traducao, com a lista "translations"${isJa ? ' e a lista "readings"' : ''}. Não escreva nada antes.

${numbered}`;
      const { data, usage } = await callClaudeJSON<{ translations: string[]; readings?: string[] }>(
        prompt,
        {
          name: 'salvar_traducao',
          description: 'Salva a tradução de cada linha, na mesma ordem.',
          schema: {
            type: 'object',
            properties: {
              translations: { type: 'array', items: { type: 'string' } },
              ...(isJa ? { readings: { type: 'array', items: { type: 'string' } } } : {}),
            },
            required: isJa ? ['translations', 'readings'] : ['translations'],
          },
        },
        8000,
        model
      );
      await logUsage(sb, user.id, 'translate', model, usage);
      const out = Array.isArray(data?.translations) ? data.translations : null;
      if (!out || !out.some((x) => String(x || '').trim())) throw new AiError('Resposta inesperada da IA. Tente de novo.', 502);
      part.forEach((l, i) => {
        if (out[i]) tr.set(l, String(out[i]));
        if (isJa && Array.isArray(data.readings) && data.readings[i]) rd.set(l, String(data.readings[i]).slice(0, 400));
      });
    };

    try {
      await ask(uniq);
    } catch (e: any) {
      // Plano B: em pedaços menores. O pedaço que falhar fica em branco (dá para digitar ou tentar de novo).
      if (e instanceof AiError && (e.status === 429 || /limite|cota/i.test(e.message))) throw e;
      const SIZE = 12;
      for (let k = 0; k < uniq.length; k += SIZE) {
        const part = uniq.slice(k, k + SIZE).filter((l) => !tr.has(l));
        if (!part.length) continue;
        try {
          await ask(part);
        } catch (err) {
          console.error('translate: pedaço falhou', (err as any)?.message);
        }
      }
      if (!tr.size) throw new AiError('A IA não conseguiu traduzir esta letra agora. Tente de novo daqui a pouco.', 502);
    }

    const translations = lines.map((l) => (l.trim() ? tr.get(l.trim()) || '' : ''));
    const missing = lines.filter((l) => l.trim() && !tr.get(l.trim())).length;
    if (isJa) {
      const readings = lines.map((l) => (l.trim() ? rd.get(l.trim()) || '' : ''));
      return NextResponse.json({ translations, readings, missing });
    }
    return NextResponse.json({ translations, missing });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao traduzir.' }, { status });
  }
}
