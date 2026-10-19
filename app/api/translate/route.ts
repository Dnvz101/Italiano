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

    const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    const prompt = `Você é um professor de ${LANGS[from]} para brasileiros. Traduza cada linha abaixo para o português do Brasil.
Regras:
- Tradução natural, como um brasileiro diria, mas fiel ao sentido. Se houver gíria ou expressão idiomática, traduza o sentido.
${from === 'ja' ? `- Em "readings", dê a leitura de cada linha SÓ em hiragana (katakana e kanji viram hiragana), com espaço entre as palavras, como num livro infantil. Mesma quantidade de itens.\n` : ''}- Mantenha exatamente ${lines.length} itens, na mesma ordem. Linha vazia vira string vazia.
- Entregue chamando a ferramenta salvar_traducao, com a lista "translations"${from === 'ja' ? ' e a lista "readings"' : ''}.

${numbered}`;

    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
    const { data, usage } = await callClaudeJSON<{ translations: string[]; readings?: string[] }>(
      prompt,
      {
        name: 'salvar_traducao',
        description: 'Salva a tradução de cada linha, na mesma ordem.',
        schema: {
          type: 'object',
          properties: {
            translations: { type: 'array', items: { type: 'string' } },
            ...(from === 'ja' ? { readings: { type: 'array', items: { type: 'string' } } } : {}),
          },
          required: from === 'ja' ? ['translations', 'readings'] : ['translations'],
        },
      },
      8000,
      model
    );
    await logUsage(sb, user.id, 'translate', model, usage);
    const out: any = Array.isArray(data.translations) ? data.translations : null;
    if (!out) throw new AiError('Resposta inesperada da IA. Tente de novo.', 502);
    const translations = lines.map((l, i) => (l.trim() ? String(out[i] ?? '') : ''));
    if (from === 'ja') {
      const rd: any[] = Array.isArray(data.readings) ? data.readings : [];
      const readings = lines.map((l, i) => (l.trim() ? String(rd[i] ?? '').slice(0, 400) : ''));
      return NextResponse.json({ translations, readings });
    }
    return NextResponse.json({ translations });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao traduzir.' }, { status });
  }
}
