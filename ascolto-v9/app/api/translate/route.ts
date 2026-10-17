import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaude, checkQuota, logUsage } from '@/lib/ai';

export const runtime = 'nodejs';

const LANGS: Record<string, string> = { it: 'italiano', de: 'alemão' };
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
- Mantenha exatamente ${lines.length} itens, na mesma ordem. Linha vazia vira string vazia.
- Responda SOMENTE com um array JSON de strings, sem comentários.

${numbered}`;

    const { text, model, usage } = await callClaude(prompt);
    await logUsage(sb, user.id, 'translate', model, usage);

    const match = text.match(/\[[\s\S]*\]/);
    let out: any = null;
    try {
      out = match ? JSON.parse(match[0]) : null;
    } catch {}
    if (!Array.isArray(out)) throw new AiError('Resposta inesperada da IA. Tente de novo.', 502);
    const translations = lines.map((l, i) => (l.trim() ? String(out[i] ?? '') : ''));
    return NextResponse.json({ translations });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao traduzir.' }, { status });
  }
}
